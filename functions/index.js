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

exports.createUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const data = request.data || {};
  const firstName = requireNonEmptyString(data.firstName, 'First name');
  const lastName = requireNonEmptyString(data.lastName, 'Last name');
  const middleName = requireNonEmptyString(data.middleName, 'Middle name');
  const birthdate = requireNonEmptyString(data.birthdate, 'Birthdate');
  const address = requireNonEmptyString(data.address, 'Address');
  const phone = requireNonEmptyString(data.phone, 'Phone');
  const email = requireNonEmptyString(data.email, 'Email').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }

  const role = data.role === 'admin' ? 'admin' : 'member';
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

