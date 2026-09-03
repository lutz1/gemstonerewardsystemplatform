const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
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

exports.healthCheck = onRequest({ region: 'asia-southeast1' }, (_request, response) => {
  response.status(200).json({ status: 'ok' });
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

    return {
      mpinSetup: userSnapshot.data()?.mpinSetup === true,
      role: userSnapshot.data()?.role || 'member',
    };
  } catch (error) {
    if (error.code === 5) {
      return { mpinSetup: false, role: 'member' };
    }

    throw error;
  }
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
  const joinDate = new Date().toISOString();

  const userDoc = {
    username,
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
    totalSpent: 0,
    mpinSetup: false,
    joinDate,
    createdAt: joinDate,
  };

  await db().collection('users').doc(userRecord.uid).set(userDoc);

  return { id: userRecord.uid, ...userDoc };
});

