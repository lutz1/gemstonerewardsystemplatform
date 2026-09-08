const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp } = require('firebase-admin/app');
const crypto = require('crypto');

initializeApp();

const DEFAULT_PASSWORD = 'gemstonecode';

// Project's Firestore database is named "default" rather than the reserved "(default)" id.
function db() {
  return getFirestore('default');
}

function hashMpin(mpin) {
  return crypto.createHash('sha256').update(mpin).digest('hex');
}

function validateMpin(mpin) {
  if (typeof mpin !== 'string' || !/^\d{4}$/.test(mpin)) {
    throw new HttpsError('invalid-argument', 'MPIN must contain exactly 4 digits.');
  }
}

// Generates a cryptographically secure, Ethereum-style wallet address.
function generateWalletAddress() {
  return `0x${crypto.randomBytes(20).toString('hex')}`;
}

async function generateReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `GSC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const snapshot = await db()
      .collection('users')
      .where('referralCode', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) return code;
  }

  throw new HttpsError('internal', 'Failed to generate a unique referral code.');
}

async function assertIsAdmin(uid) {
  const snapshot = await db().collection('users').doc(uid).get();
  if (snapshot.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin privileges are required.');
  }
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }
  return value.trim();
}

function nextManilaMidnight(date = new Date()) {
  const manilaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  manilaTime.setUTCHours(24, 0, 0, 0);
  return new Date(manilaTime.getTime() - (8 * 60 * 60 * 1000)).toISOString();
}

const MEMBERSHIP_PACKAGES = {
  emerald: { name: 'Emerald Membership', tier: 'EMERALD', price: 1650, serviceFee: 50, dailyGemReward: 2, distributionReward: 1, quantity: 1 },
  sapphire: { name: 'Sapphire Membership', tier: 'SAPPHIRE', price: 7790, serviceFee: 150, dailyGemReward: 6, distributionReward: 3, quantity: 1 },
  diamond: { name: 'Diamond Membership', tier: 'DIAMOND', price: 14350, serviceFee: 250, dailyGemReward: 10, distributionReward: 5, quantity: 1 },
};

exports.healthCheck = onRequest({ region: 'asia-southeast1' }, (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

exports.completePurchase = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const packageId = typeof request.data?.packageId === 'string'
    ? request.data.packageId.trim()
    : '';
  const selectedPackage = MEMBERSHIP_PACKAGES[packageId];
  if (!selectedPackage) {
    throw new HttpsError('invalid-argument', 'The selected membership is invalid.');
  }

  const userRef = db().collection('users').doc(request.auth.uid);
  const purchaseRef = db().collection('purchases').doc();
  const now = new Date().toISOString();
  const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  const receiptId = `RCPT-${suffix}`;
  const transactionId = `TXN-${suffix}`;
  const invoiceNo = `INV-${suffix}`;
  const total = selectedPackage.price + selectedPackage.serviceFee;
  const expiresAt = new Date(Date.now() + (45 * 24 * 60 * 60 * 1000)).toISOString();
  const nextRewardAt = nextManilaMidnight();
  const usersSnapshot = await db().collection('users').get();
  const usersByReferralCode = new Map();
  usersSnapshot.docs.forEach((document) => {
    const referralCode = document.data()?.referralCode;
    if (referralCode) usersByReferralCode.set(referralCode, document);
  });

  const purchaserData = usersSnapshot.docs.find((document) => document.id === request.auth.uid)?.data() || {};
  const distributionRecipients = [];
  const selectedRecipientIds = new Set();
  let nextUplineCode = purchaserData.uplineReferralCode || '';
  let firstLeaderFound = false;
  let firstCeoFound = false;
  const visitedReferralCodes = new Set();

  while (nextUplineCode && !visitedReferralCodes.has(nextUplineCode)) {
    visitedReferralCodes.add(nextUplineCode);
    const ancestor = usersByReferralCode.get(nextUplineCode);
    if (!ancestor) break;

    const ancestorData = ancestor.data() || {};
    const ancestorRole = String(ancestorData.role || '').toLowerCase();
    if (distributionRecipients.length === 0) {
      distributionRecipients.push({ document: ancestor, role: 'upline' });
      selectedRecipientIds.add(ancestor.id);
    } else if (ancestorRole === 'leader' && !firstLeaderFound && !selectedRecipientIds.has(ancestor.id)) {
      distributionRecipients.push({ document: ancestor, role: 'leader' });
      selectedRecipientIds.add(ancestor.id);
      firstLeaderFound = true;
    } else if (ancestorRole === 'ceo' && !firstCeoFound && !selectedRecipientIds.has(ancestor.id)) {
      distributionRecipients.push({ document: ancestor, role: 'ceo' });
      selectedRecipientIds.add(ancestor.id);
      firstCeoFound = true;
    }

    nextUplineCode = ancestorData.uplineReferralCode || '';
  }

  await db().runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Your user account could not be found.');
    }

    const userData = userSnapshot.data() || {};
    const walletBalance = Number(userData.walletBalance ?? userData.balance ?? 0);
    if (!Number.isFinite(walletBalance) || walletBalance < total) {
      throw new HttpsError(
        'failed-precondition',
        'Insufficient wallet balance to complete this purchase.',
      );
    }

    const recipientSnapshots = await Promise.all(
      distributionRecipients.map(({ document }) => transaction.get(document.ref)),
    );
    const rewardRefs = distributionRecipients.map(({ document, role }) =>
      document.ref.collection('gemTransactions').doc(`${purchaseRef.id}-${role}`),
    );
    const rewardSnapshots = await Promise.all(rewardRefs.map((rewardRef) => transaction.get(rewardRef)));
    const distribution = distributionRecipients.map(({ document, role }, index) => ({
      userId: document.id,
      role,
      amount: selectedPackage.distributionReward,
      snapshot: recipientSnapshots[index],
      rewardRef: rewardRefs[index],
      rewardExists: rewardSnapshots[index].exists,
    }));
    const currentGemPoints = Number(userData.gemPoints || 0);
    const purchaserRewardRef = userRef.collection('gemTransactions').doc(`${purchaseRef.id}-membership`);

    transaction.update(userRef, {
      walletBalance: walletBalance - total,
      gemPoints: (Number.isFinite(currentGemPoints) ? currentGemPoints : 0) + selectedPackage.dailyGemReward,
      membershipTier: selectedPackage.tier,
      membershipExpiresAt: expiresAt,
      dailyGemReward: selectedPackage.dailyGemReward,
      nextGemRewardAt: nextRewardAt,
      membershipStatus: 'active',
      updatedAt: now,
    });
    transaction.set(purchaserRewardRef, {
      type: 'membership_activation_reward',
      amount: selectedPackage.dailyGemReward,
      tier: selectedPackage.tier,
      purchaseId: purchaseRef.id,
      createdAt: now,
    });
    distribution.forEach(({ snapshot, rewardRef, rewardExists, amount, role }) => {
      if (!snapshot.exists || rewardExists) return;
      const recipientData = snapshot.data() || {};
      const recipientGemPoints = Number(recipientData.gemPoints || 0);
      transaction.update(snapshot.ref, {
        gemPoints: (Number.isFinite(recipientGemPoints) ? recipientGemPoints : 0) + amount,
        updatedAt: now,
      });
      transaction.set(rewardRef, {
        type: 'purchase_distribution',
        amount,
        role,
        purchaseId: purchaseRef.id,
        sourceUserId: request.auth.uid,
        tier: selectedPackage.tier,
        createdAt: now,
      });
    });
    transaction.set(purchaseRef, {
      userId: request.auth.uid,
      customerName: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email || request.auth.token.email || '',
      packageId,
      packageName: selectedPackage.name,
      tier: selectedPackage.tier,
      quantity: selectedPackage.quantity,
      amount: selectedPackage.price,
      total,
      serviceFee: selectedPackage.serviceFee,
      dailyGemReward: selectedPackage.dailyGemReward,
      purchaserReward: selectedPackage.dailyGemReward,
      distributionReward: selectedPackage.distributionReward,
      distribution: distribution.map(({ userId, role, amount }) => ({ userId, role, amount })),
      membershipExpiresAt: expiresAt,
      paymentMethod: 'wallet',
      receiptId,
      transactionId,
      invoiceNo,
      status: 'completed',
      createdAt: now,
      completedAt: now,
    });
  });

  return {
    success: true,
    receiptId,
    transactionId,
    invoiceNo,
    completedAt: now,
    serviceFee: selectedPackage.serviceFee,
    total,
    earnedGems: selectedPackage.dailyGemReward,
    paymentMethod: 'wallet',
  };
});

exports.creditDailyGemRewards = onSchedule({
  schedule: '0 0 * * *',
  timeZone: 'Asia/Manila',
  region: 'asia-southeast1',
}, async () => {
  const now = new Date();
  const nowIso = now.toISOString();
  const usersSnapshot = await db().collection('users').get();
  let credited = 0;
  let expired = 0;

  for (const userDocument of usersSnapshot.docs) {
    const userRef = userDocument.ref;
    const userData = userDocument.data() || {};
    const expiresAt = new Date(userData.membershipExpiresAt || 0);
    const nextRewardAt = new Date(userData.nextGemRewardAt || 0);
    const dailyGemReward = Number(userData.dailyGemReward || 0);

    if (!Number.isFinite(expiresAt.getTime())) continue;

    if (expiresAt.getTime() <= now.getTime()) {
      if (userData.membershipStatus === 'active') {
        await userRef.update({ membershipStatus: 'expired', updatedAt: nowIso });
        expired += 1;
      }
      continue;
    }

    if (userData.membershipStatus !== 'active' || dailyGemReward <= 0 || nextRewardAt > now) {
      continue;
    }

    const rewardKey = now.toISOString().slice(0, 10);
    const rewardRef = userRef.collection('gemTransactions').doc(`daily-${rewardKey}`);
    await db().runTransaction(async (transaction) => {
      const [currentUserSnapshot, rewardSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(rewardRef),
      ]);
      if (!currentUserSnapshot.exists || rewardSnapshot.exists) return;

      const currentUser = currentUserSnapshot.data() || {};
      const currentGemPoints = Number(currentUser.gemPoints || 0);
      const currentExpiry = new Date(currentUser.membershipExpiresAt || 0);
      if (currentUser.membershipStatus !== 'active' || currentExpiry <= now) return;

      transaction.update(userRef, {
        gemPoints: (Number.isFinite(currentGemPoints) ? currentGemPoints : 0) + dailyGemReward,
        nextGemRewardAt: nextManilaMidnight(now),
        updatedAt: nowIso,
      });
      transaction.set(rewardRef, {
        type: 'daily_membership_reward',
        amount: dailyGemReward,
        tier: currentUser.membershipTier || '',
        createdAt: nowIso,
      });
      credited += 1;
    });
  }

  console.log(`Daily GEM rewards credited: ${credited}; memberships expired: ${expired}`);
});

exports.resolveUsername = onCall({ region: 'asia-southeast1' }, async (request) => {
  const username = requireNonEmptyString(request.data?.username, 'Username');
  const normalizedUsername = username.toUpperCase();
  let snapshot = await db()
    .collection('users')
    .where('username', '==', normalizedUsername)
    .limit(1)
    .get();

  if (snapshot.empty && normalizedUsername !== username.toLowerCase()) {
    snapshot = await db()
      .collection('users')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
  }

  const email = snapshot.docs[0]?.data()?.email;
  if (!email) {
    throw new HttpsError('not-found', 'Invalid username or password.');
  }

  return { email };
});

exports.registerMembership = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = request.data || {};
  const username = requireNonEmptyString(data.username, 'Username').toUpperCase();
  const firstName = requireNonEmptyString(data.firstName, 'First name').toUpperCase();
  const lastName = requireNonEmptyString(data.lastName, 'Last name').toUpperCase();
  const middleName = typeof data.middleName === 'string' ? data.middleName.trim().toUpperCase() : '';
  const email = requireNonEmptyString(data.email, 'Email').toLowerCase();
  const phone = requireNonEmptyString(data.phone, 'Phone');
  const birthdate = requireNonEmptyString(data.birthdate, 'Birthdate');
  const suppliedReferral = typeof data.referralCode === 'string' ? data.referralCode.trim() : '';
  const civilStatus = ['single', 'married', 'widowed', 'separated'].includes(data.civilStatus)
    ? data.civilStatus
    : 'single';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }

  const usernameSnapshot = await db().collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  if (!usernameSnapshot.empty) {
    throw new HttpsError('already-exists', 'A user with this username already exists.');
  }

  let uplineReferralCode = '';
  let uplineUsername = '';
  if (suppliedReferral) {
    let referralSnapshot = await db().collection('users')
      .where('referralCode', '==', suppliedReferral.toUpperCase())
      .limit(1)
      .get();

    if (referralSnapshot.empty) {
      referralSnapshot = await db().collection('users')
        .where('username', '==', suppliedReferral.toUpperCase())
        .limit(1)
        .get();
    }

    if (referralSnapshot.empty && suppliedReferral.toUpperCase() !== suppliedReferral.toLowerCase()) {
      referralSnapshot = await db().collection('users')
        .where('username', '==', suppliedReferral.toLowerCase())
        .limit(1)
        .get();
    }

    if (referralSnapshot.empty) {
      throw new HttpsError('invalid-argument', 'The referral code is invalid.');
    }

    const upline = referralSnapshot.docs[0].data() || {};
    uplineReferralCode = upline.referralCode || suppliedReferral.toUpperCase();
    uplineUsername = upline.username || '';
  }

  let userRecord;
  try {
    userRecord = await getAuth().createUser({
      email,
      password: DEFAULT_PASSWORD,
      displayName: `${firstName} ${lastName}`,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A user with this email already exists.');
    }
    throw new HttpsError('internal', 'Failed to create the authentication account.');
  }

  const referralCode = await generateReferralCode();
  const joinDate = new Date().toISOString();
  const settingsSnapshot = await db().collection('settings').doc('admin').get();
  const defaultGemValue = Number(settingsSnapshot.data()?.defaultGemValue);
  const initialGemPoints = Number.isFinite(defaultGemValue) ? defaultGemValue : 0;
  const userDoc = {
    username,
    referralCode,
    uplineReferralCode,
    uplineUsername,
    firstName,
    lastName,
    middleName,
    name: `${firstName} ${lastName}`,
    email,
    phone,
    birthdate,
    civilStatus,
    role: 'member',
    status: 'active',
    walletAddress: generateWalletAddress(),
    gemPoints: initialGemPoints,
    walletBalance: 0,
    totalSpent: 0,
    mpinSetup: false,
    joinDate,
    createdAt: joinDate,
  };

  await db().collection('users').doc(userRecord.uid).set(userDoc);
  return { id: userRecord.uid, ...userDoc };
});

exports.getUsers = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const snapshot = await db().collection('users').get();
  const users = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    const name = data.name || [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: doc.id,
      ...data,
      name: name || 'Unknown User',
      email: data.email || '',
      role: data.role || 'member',
      status: data.status || 'active',
      totalSpent: Number(data.totalSpent ?? 0),
    };
  });

  return users.sort((a, b) => {
    const aDate = new Date(a.joinDate || 0).getTime();
    const bDate = new Date(b.joinDate || 0).getTime();
    return bDate - aDate;
  });
});

exports.getAdminDashboard = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const [usersSnapshot, purchasesSnapshot, approvalsSnapshot, codesSnapshot] = await Promise.all([
    db().collection('users').get(),
    db().collection('purchases').get(),
    db().collection('purchaseRequests').get(),
    db().collection('purchaseCodes').get(),
  ]);

  const getDate = (data) => data.createdAt || data.date || data.updatedAt || null;
  const getAmount = (data) => Number(data.amount ?? data.total ?? data.price ?? 0);
  const getTier = (data) => data.tier || data.packageTier || data.packageName || 'Uncategorized';
  const getName = (data) => data.customerName || data.userName || data.name || data.email || 'Unknown user';
  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const purchases = purchasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const pendingApprovals = approvalsSnapshot.docs.filter((doc) => {
    const status = String(doc.data()?.status || '').toLowerCase();
    return !status || ['pending', 'awaiting_review', 'awaiting review'].includes(status);
  });
  const tierTotals = purchases.reduce((totals, purchase) => {
    const tier = getTier(purchase);
    const current = totals.get(tier) || { tier, count: 0, total: 0 };
    current.count += Number(purchase.quantity ?? purchase.count ?? 1);
    current.total += getAmount(purchase);
    totals.set(tier, current);
    return totals;
  }, new Map());
  const activities = [
    ...purchases.slice(-3).map((purchase) => ({
      id: purchase.id,
      title: 'Purchase recorded',
      detail: `${getTier(purchase)} · ${getName(purchase)}`,
      time: getDate(purchase),
      tone: 'green',
    })),
    ...pendingApprovals.slice(-2).map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        title: 'Approval awaiting review',
        detail: `${getTier(data)} · ${getName(data)}`,
        time: getDate(data),
        tone: 'amber',
      };
    }),
  ];

  return {
    totalSales: purchases.reduce((total, purchase) => total + getAmount(purchase), 0),
    totalCodes: codesSnapshot.size || purchases.reduce(
      (total, purchase) => total + Number(purchase.quantity ?? purchase.count ?? 0),
      0,
    ),
    activeUsers: users.filter((user) => (user.status || 'active') === 'active').length,
    userCount: users.length,
    pendingApprovals: pendingApprovals.length,
    purchaseTotalsByTier: Array.from(tierTotals.values()),
    activities: activities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)),
  };
});

exports.getMpinStatus = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  try {
    const userSnapshot = await db()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    const userData = userSnapshot.data() || {};
    const referralCode = userData.referralCode || await generateReferralCode();

    if (!userData.referralCode) {
      await db()
        .collection('users')
        .doc(request.auth.uid)
        .set({ referralCode }, { merge: true });
    }

    return {
      mpinSetup: userData.mpinSetup === true,
      role: userData.role || 'member',
      username: userData.username || '',
      referralCode,
    };
  } catch (error) {
    if (error.code === 5) {
      return { mpinSetup: false, role: 'member', username: '', referralCode: '' };
    }

    throw error;
  }
});

exports.getUserProfile = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const [snapshot, settingsSnapshot] = await Promise.all([
    db().collection('users').doc(request.auth.uid).get(),
    db().collection('settings').doc('admin').get(),
  ]);
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Your profile could not be found.');
  }

  const data = snapshot.data() || {};
  const configuredGemValue = Number(settingsSnapshot.data()?.defaultGemValue);
  const fallbackGemPoints = Number.isFinite(configuredGemValue)
    ? configuredGemValue
    : null;
  return {
    id: snapshot.id,
    username: data.username || '',
    referralCode: data.referralCode || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    middleName: data.middleName || '',
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    birthdate: data.birthdate || '',
    civilStatus: data.civilStatus || '',
    address: data.address || '',
    role: data.role || 'member',
    status: data.status || 'active',
    walletAddress: data.walletAddress || '',
    totalSpent: Number(data.totalSpent ?? 0),
    joinDate: data.joinDate || data.createdAt || '',
    createdAt: data.createdAt || '',
    tier: data.tier || '',
    membershipTier: data.membershipTier || '',
    nextTier: data.nextTier || '',
    gemsToNext: data.gemsToNext ?? null,
    tierProgress: data.tierProgress ?? data.progressPercent ?? 0,
    codesPurchased: data.codesPurchased ?? data.totalCodes ?? null,
    activeReferrals: data.activeReferrals ?? data.referrals ?? null,
    gemPoints: data.gemPoints ?? data.gemsBalance ?? data.gemBalance ?? data.gems ?? fallbackGemPoints,
    gemsBalance: data.gemsBalance ?? data.gemPoints ?? data.gemBalance ?? data.gems ?? fallbackGemPoints,
  };
});

exports.getUserDashboard = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const userSnapshot = await db().collection('users').doc(request.auth.uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError('not-found', 'Your dashboard data could not be found.');
  }

  const userData = userSnapshot.data() || {};
  const referralCode = userData.referralCode || '';
  const [referralsSnapshot, purchasesSnapshot, codesSnapshot, settingsSnapshot, usersSnapshot] = await Promise.all([
    referralCode
      ? db().collection('users').where('uplineReferralCode', '==', referralCode).get()
      : Promise.resolve({ size: 0, docs: [] }),
    db().collection('purchases').get(),
    db().collection('purchaseCodes').get(),
    db().collection('settings').doc('admin').get(),
    db().collection('users').get(),
  ]);

  const usersByUplineCode = new Map();
  usersSnapshot.docs.forEach((document) => {
    const uplineCode = document.data()?.uplineReferralCode;
    if (!uplineCode) return;
    const children = usersByUplineCode.get(uplineCode) || [];
    children.push(document);
    usersByUplineCode.set(uplineCode, children);
  });

  const networkUsers = new Set();
  const visitedCodes = new Set();
  const pendingCodes = [referralCode];
  while (pendingCodes.length > 0) {
    const parentCode = pendingCodes.shift();
    if (!parentCode || visitedCodes.has(parentCode)) continue;
    visitedCodes.add(parentCode);

    const children = usersByUplineCode.get(parentCode) || [];
    children.forEach((document) => {
      if (document.id === request.auth.uid || networkUsers.has(document.id)) return;
      networkUsers.add(document.id);
      const childCode = document.data()?.referralCode;
      if (childCode) pendingCodes.push(childCode);
    });
  }
  const networkReferralCount = networkUsers.size;

  const belongsToUser = (data) =>
    data.userId === request.auth.uid ||
    data.uid === request.auth.uid ||
    data.ownerId === request.auth.uid ||
    data.customerId === request.auth.uid ||
    (userData.email && data.email === userData.email) ||
    (userData.username && data.username === userData.username);

  const ownedPurchases = purchasesSnapshot.docs.filter((document) =>
    belongsToUser(document.data() || {}),
  );
  const ownedCodes = codesSnapshot.docs.filter((document) =>
    belongsToUser(document.data() || {}),
  );
  const configuredGemValue = Number(settingsSnapshot.data()?.defaultGemValue);
  const fallbackGemPoints = Number.isFinite(configuredGemValue)
    ? configuredGemValue
    : null;
  const recentTransactions = ownedPurchases
    .map((document) => {
      const data = document.data() || {};
      return {
        id: document.id,
        label: data.packageName || data.tier || 'Purchase',
        detail: `${data.paymentMethod === 'wallet' ? 'Wallet payment' : 'Transaction'} · ${data.status || 'completed'}`,
        amount: Number(data.total ?? data.amount ?? 0),
        createdAt: data.completedAt || data.createdAt || data.date || null,
        status: data.status || 'completed',
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

  return {
    name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' '),
    walletAddress: userData.walletAddress || '',
    walletBalance: userData.walletBalance ?? userData.balance ?? null,
    gemPoints: userData.gemPoints ?? userData.gemsBalance ?? userData.gems ?? fallbackGemPoints,
    directReferrals: userData.directReferrals ?? userData.activeReferrals ?? referralsSnapshot.size,
    networkReferrals: userData.networkReferrals ?? userData.indirectReferrals ?? networkReferralCount,
    purchaseCodes: userData.purchaseCodes ?? userData.totalCodes ??
      (ownedCodes.length || ownedPurchases.length || null),
    networkGrowthPercent: userData.networkGrowthPercent ?? userData.networkGrowth ?? null,
    membershipExpiry: userData.membershipExpiry || userData.membershipExpiresAt || null,
    gemValueChangePercent: userData.gemValueChangePercent ?? userData.gemValueChange ?? null,
    recentTransactions,
    hasNotifications: userData.hasNotifications === true,
  };
});

exports.getDirectReferrals = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const userSnapshot = await db().collection('users').doc(request.auth.uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError('not-found', 'Your profile could not be found.');
  }

  const userData = userSnapshot.data() || {};
  const referralCode = userData.referralCode || '';
  if (!referralCode) return [];

  const referralsSnapshot = await db()
    .collection('users')
    .where('uplineReferralCode', '==', referralCode)
    .get();

  return referralsSnapshot.docs.map((document) => {
    const data = document.data() || {};
    return {
      id: document.id,
      name: data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Member',
      username: data.username || '',
      email: data.email || '',
      status: data.status || 'active',
      joinDate: data.joinDate || data.createdAt || '',
      role: data.role || 'member',
    };
  }).sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
});

exports.getNetworkReferrals = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const userSnapshot = await db().collection('users').doc(request.auth.uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError('not-found', 'Your profile could not be found.');
  }

  const referralCode = userSnapshot.data()?.referralCode || '';
  if (!referralCode) return [];

  const usersSnapshot = await db().collection('users').get();
  const usersByUplineCode = new Map();
  usersSnapshot.docs.forEach((document) => {
    const uplineCode = document.data()?.uplineReferralCode;
    if (!uplineCode) return;
    const children = usersByUplineCode.get(uplineCode) || [];
    children.push(document);
    usersByUplineCode.set(uplineCode, children);
  });

  const uniqueUsers = new Map();
  const visitedCodes = new Set();
  const pendingCodes = [referralCode];

  while (pendingCodes.length > 0) {
    const parentCode = pendingCodes.shift();
    if (!parentCode || visitedCodes.has(parentCode)) continue;
    visitedCodes.add(parentCode);

    const children = usersByUplineCode.get(parentCode) || [];
    children.forEach((document) => {
      if (document.id === request.auth.uid || uniqueUsers.has(document.id)) return;
      uniqueUsers.set(document.id, document);
      const childCode = document.data()?.referralCode;
      if (childCode) pendingCodes.push(childCode);
    });
  }

  return Array.from(uniqueUsers.values())
    .map((document) => {
      const data = document.data() || {};
      return {
        id: document.id,
        name: data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Member',
        username: data.username || '',
        email: data.email || '',
        status: data.status || 'active',
        joinDate: data.joinDate || data.createdAt || '',
        role: data.role || 'member',
      };
    })
    .sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
});

exports.getGemValueHistory = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const range = typeof request.data?.range === 'string' ? request.data.range : '1D';
  const windows = {
    '15M': 15 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '6H': 6 * 60 * 60 * 1000,
    '12H': 12 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  const windowMs = windows[range] || windows['1D'];
  const now = Date.now();
  const start = now - windowMs;
  const [settingsSnapshot, historySnapshot] = await Promise.all([
    db().collection('settings').doc('admin').get(),
    db().collection('gemValueHistory').get(),
  ]);

  const settings = settingsSnapshot.data() || {};
  const defaultValue = Number(settings.defaultGemValue);
  const currency = settings.currency || 'PHP';
  const history = historySnapshot.docs
    .map((document) => {
      const data = document.data() || {};
      const recordedAt = data.recordedAt?.toDate
        ? data.recordedAt.toDate().getTime()
        : new Date(data.recordedAt || data.createdAt || 0).getTime();
      return {
        value: Number(data.value ?? data.defaultGemValue),
        recordedAt,
      };
    })
    .filter((point) => Number.isFinite(point.value) && point.recordedAt >= start && point.recordedAt <= now)
    .sort((a, b) => a.recordedAt - b.recordedAt);

  const points = history.length
    ? history
    : Number.isFinite(defaultValue)
      ? [{ value: defaultValue, recordedAt: now }]
      : [];

  return { currency, defaultValue: Number.isFinite(defaultValue) ? defaultValue : null, points };
});

exports.completeMpinSetup = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  validateMpin(request.data?.mpin);

  await db()
    .collection('users')
    .doc(request.auth.uid)
    .set({ mpinSetup: true, mpinHash: hashMpin(request.data.mpin) }, { merge: true });

  return { mpinSetup: true };
});

exports.verifyMpin = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  validateMpin(request.data?.mpin);

  const userSnapshot = await db()
    .collection('users')
    .doc(request.auth.uid)
    .get();
  const matches = userSnapshot.data()?.mpinHash === hashMpin(request.data.mpin);

  if (!matches) {
    throw new HttpsError('permission-denied', 'Incorrect MPIN.');
  }

  return { verified: true };
});

exports.promoteMemberToLeader = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const userId = typeof request.data?.userId === 'string' ? request.data.userId.trim() : '';
  if (!userId) {
    throw new HttpsError('invalid-argument', 'A user must be selected to promote.');
  }

  if (userId === request.auth.uid) {
    throw new HttpsError('invalid-argument', 'You cannot promote yourself.');
  }

  const targetUser = await getAuth().getUser(userId).catch(() => {
    throw new HttpsError('not-found', 'Selected user was not found.');
  });

  if (targetUser.customClaims?.role === 'admin') {
    throw new HttpsError('permission-denied', 'Admins cannot be promoted to leader.');
  }

  const updatedClaims = {
    ...(targetUser.customClaims || {}),
    role: 'leader',
  };

  await getAuth().setCustomUserClaims(userId, updatedClaims);

  await db().collection('users').doc(userId).set(
    {
      role: 'leader',
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return {
    success: true,
    userId,
    role: 'leader',
  };
});

exports.saveAdminSettings = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const data = request.data || {};
  const defaultGemValueRaw = data.defaultGemValue;
  const defaultGemValue =
    defaultGemValueRaw === '' || defaultGemValueRaw === null || defaultGemValueRaw === undefined
      ? null
      : Number(defaultGemValueRaw);

  if (defaultGemValue !== null && (!Number.isFinite(defaultGemValue) || defaultGemValue < 0)) {
    throw new HttpsError('invalid-argument', 'Default GEM Value must be a non-negative number.');
  }

  const settingsDoc = {
    defaultGemValue,
    currency: typeof data.currency === 'string' && data.currency ? data.currency : 'PHP',
    minExchangeValue: Number(data.minExchangeValue ?? 0),
    approvalRequired: Boolean(data.approvalRequired),
    maintenanceMode: Boolean(data.maintenanceMode),
    systemEmail:
      typeof data.systemEmail === 'string' && data.systemEmail.trim()
        ? data.systemEmail.trim()
        : 'support@gemstonecode.com',
    updatedAt: new Date().toISOString(),
  };

  await db().collection('settings').doc('admin').set(settingsDoc, { merge: true });

  if (defaultGemValue !== null) {
    await db().collection('gemValueHistory').add({
      value: defaultGemValue,
      currency: settingsDoc.currency,
      recordedAt: new Date().toISOString(),
      source: 'admin-settings',
    });
  }

  return { success: true, ...settingsDoc };
});

exports.createUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const data = request.data || {};
  const username = requireNonEmptyString(data.username, 'Username').toUpperCase();
  const firstName = requireNonEmptyString(data.firstName, 'First name').toUpperCase();
  const lastName = requireNonEmptyString(data.lastName, 'Last name').toUpperCase();
  const middleName = typeof data.middleName === 'string' ? data.middleName.trim().toUpperCase() : '';
  const birthdate = requireNonEmptyString(data.birthdate, 'Birthdate');
  const address = requireNonEmptyString(data.address, 'Address').toUpperCase();
  const phone = requireNonEmptyString(data.phone, 'Phone');
  const email = requireNonEmptyString(data.email, 'Email').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }

  const role = ['member', 'ceo', 'admin'].includes(data.role) ? data.role : 'member';
  const status = data.status === 'suspended' ? 'suspended' : 'active';
  const civilStatus = ['single', 'married', 'widowed', 'separated'].includes(data.civilStatus)
    ? data.civilStatus
    : 'single';
  const name = `${firstName} ${lastName}`;

  let userRecord;
  try {
    userRecord = await getAuth().createUser({
      email,
      password: DEFAULT_PASSWORD,
      displayName: name,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A user with this email already exists.');
    }
    throw new HttpsError('internal', 'Failed to create the authentication account.');
  }

  await getAuth().setCustomUserClaims(userRecord.uid, { role });

  const walletAddress = generateWalletAddress();
  const referralCode = await generateReferralCode();
  const joinDate = new Date().toISOString();
  const settingsSnapshot = await db().collection('settings').doc('admin').get();
  const defaultGemValue = Number(settingsSnapshot.data()?.defaultGemValue);
  const initialGemPoints = Number.isFinite(defaultGemValue) ? defaultGemValue : 0;

  const userDoc = {
    username,
    referralCode,
    firstName,
    lastName,
    middleName,
    name,
    birthdate,
    civilStatus,
    address,
    phone,
    email,
    role,
    status,
    walletAddress,
    gemPoints: initialGemPoints,
    walletBalance: 0,
    totalSpent: 0,
    mpinSetup: false,
    joinDate,
    createdAt: joinDate,
  };

  await db().collection('users').doc(userRecord.uid).set(userDoc);

  return { id: userRecord.uid, ...userDoc };
});

