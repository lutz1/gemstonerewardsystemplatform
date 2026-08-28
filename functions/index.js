const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');
const crypto = require('crypto');

initializeApp();

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

exports.healthCheck = onRequest({ region: 'asia-southeast1' }, (_request, response) => {
  response.status(200).json({ status: 'ok' });
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

