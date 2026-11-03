const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const crypto = require('crypto');

initializeApp();

const DEFAULT_PASSWORD = 'gemstonecode';
const DAILY_EARNING_TYPES = [
  'daily_membership_reward',
  'daily_hierarchy_distribution_reward',
  'gem_burn',
];
const DAILY_REWARD_HOUR = 0;
const DAILY_REWARD_MINUTE = 0;
const PAYMONGO_SECRET_KEY = defineSecret('PAYMONGO_SECRET_KEY');
const PAYMONGO_WEBHOOK_SECRET = defineSecret('PAYMONGO_WEBHOOK_SECRET');
const DEPOSIT_MINIMUM_CENTAVOS = 100;
const PUMP_VALUE_PIN_SALT = 'f49bff74a5d5958f89fa6153324495b8';
const PUMP_VALUE_PIN_HASH = '50f15c945d236dc3c96c4dea72c00585f17218737bcd0e457ed7a28ef0630e185817685868e6362010380111e52eb76f23ab6655fe7ca258f1bbada374a023b0';
const GEM_VALUE_EARNING_TYPES = [
  'daily_membership_reward',
  'daily_hierarchy_distribution_reward',
  'membership_activation_reward',
  'purchase_distribution',
];

function getGemValueSnapshot(totalAccumulatedGems, totalGemBurn = 0, totalGemPump = 0) {
  const total = Number(totalAccumulatedGems);
  const burn = Number(totalGemBurn);
  const pump = Number(totalGemPump);
  const gemPond = Number.isFinite(total)
    ? Number((((total + (Number.isFinite(burn) ? burn : 0)) * 0.40)
      + (Number.isFinite(pump) ? pump : 0)).toFixed(2))
    : 0;
  const value = total > 0 ? Number((gemPond / total).toFixed(4)) : 0;
  return { totalAccumulatedGems: total > 0 ? total : 0, gemPond, value };
}

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

function verifyPumpValuePin(candidate) {
  const hasValidFormat = typeof candidate === 'string' && /^\d{4}$/.test(candidate);
  const candidatePin = hasValidFormat ? candidate : 'invalid';
  const candidateHash = crypto.scryptSync(
    candidatePin,
    Buffer.from(PUMP_VALUE_PIN_SALT, 'hex'),
    64,
  );
  const expectedHash = Buffer.from(PUMP_VALUE_PIN_HASH, 'hex');
  const isValid = hasValidFormat && crypto.timingSafeEqual(candidateHash, expectedHash);
  if (!isValid) {
    throw new HttpsError('permission-denied', 'Incorrect PIN.');
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

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function manilaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextManilaRewardAt(date = new Date()) {
  const [year, month, day] = manilaDateKey(date).split('-').map(Number);
  const scheduledToday = new Date(Date.UTC(
    year,
    month - 1,
    day,
    DAILY_REWARD_HOUR - 8,
    DAILY_REWARD_MINUTE,
  ));

  if (date.getTime() < scheduledToday.getTime()) {
    return scheduledToday.toISOString();
  }

  return new Date(scheduledToday.getTime() + (24 * 60 * 60 * 1000)).toISOString();
}

function getMembershipDayNumber(membershipStartDate, date = new Date()) {
  const startDate = asDate(membershipStartDate);
  if (!startDate) return null;

  const [startYear, startMonth, startDay] = manilaDateKey(startDate).split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = manilaDateKey(date).split('-').map(Number);
  const startDayUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const currentDayUtc = Date.UTC(currentYear, currentMonth - 1, currentDay);
  return Math.floor((currentDayUtc - startDayUtc) / (24 * 60 * 60 * 1000)) + 1;
}

const MEMBERSHIP_PACKAGES = {
  emerald: { name: 'Emerald Membership', tier: 'EMERALD', price: 1765, serviceFee: 0, dailyGemReward: 2, distributionReward: 1, quantity: 1 },
  sapphire: { name: 'Sapphire Membership', tier: 'SAPPHIRE', price: 8335, serviceFee: 0, dailyGemReward: 6, distributionReward: 3, quantity: 1 },
  diamond: { name: 'Diamond Membership', tier: 'DIAMOND', price: 2200, serviceFee: 0, dailyGemReward: 10, distributionReward: 5, quantity: 1 },
};
const DAILY_DISTRIBUTION_REWARDS = {
  EMERALD: 1,
  SAPPHIRE: 3,
  DIAMOND: 5,
};
const WITHDRAWAL_MINIMUM = 200;
const WITHDRAWAL_MAXIMUM = 50000;
const WITHDRAWAL_FEE_RATE = 0.08;
const WITHDRAWAL_EWALLET_PROVIDERS = ['GCash', 'Maya', 'GrabPay', 'GoTyme', 'Coins.ph'];
const WITHDRAWAL_BANK_PROVIDERS = [
  'BDO Unibank',
  'BPI',
  'China Bank',
  'Land Bank of the Philippines',
  'Metrobank',
  'PNB',
  'RCBC',
  'Security Bank',
  'UnionBank',
];

exports.healthCheck = onRequest({ region: 'asia-southeast1' }, (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

exports.submitSellerApplication = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to submit a seller application.');
  }

  const uid = request.auth.uid;
  const applicationId = request.data?.applicationId;
  const editApplicationId = request.data?.editApplicationId;
  const application = request.data?.application;
  const uploads = request.data?.uploads;

  if (typeof applicationId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)
    || (editApplicationId !== undefined && editApplicationId !== applicationId)
    || !application || typeof application !== 'object'
    || !uploads || typeof uploads !== 'object' || Array.isArray(uploads)) {
    throw new HttpsError('invalid-argument', 'The seller application data is invalid.');
  }
  const isEditing = typeof editApplicationId === 'string';
  const applicationRef = db()
    .collection('sellerApplications')
    .doc(uid)
    .collection('applications')
    .doc(applicationId);
  const existingApplicationSnapshot = isEditing ? await applicationRef.get() : null;
  const existingApplication = existingApplicationSnapshot?.data() || {};
  if (isEditing) {
    if (!existingApplicationSnapshot.exists || existingApplication.userId !== uid) {
      throw new HttpsError('not-found', 'Seller application not found.');
    }
    if (existingApplication.status !== 'needs_additional_documents') {
      throw new HttpsError(
        'failed-precondition',
        'This application is no longer waiting for additional information.',
      );
    }
  }
  if (!isEditing) {
    const latestApplicationSnapshot = await db()
      .collection('sellerApplications')
      .doc(uid)
      .collection('applications')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const latestApplication = latestApplicationSnapshot.docs[0]?.data();
    if (latestApplication?.status === 'rejected') {
      const rejectedAt = latestApplication.adminReview?.rejectedAt?.toDate?.();
      if (!(rejectedAt instanceof Date) || Number.isNaN(rejectedAt.getTime())) {
        throw new HttpsError(
          'failed-precondition',
          'The rejection date is unavailable. Please contact support before reapplying.',
        );
      }
      const reapplicationAvailableAt = rejectedAt.getTime() + (24 * 60 * 60 * 1000);
      if (Date.now() < reapplicationAvailableAt) {
        throw new HttpsError(
          'failed-precondition',
          `You may submit a new application after ${new Date(reapplicationAvailableAt).toISOString()}.`,
        );
      }
    }
  }

  const requiredText = (key, maxLength = 500) => {
    const value = application[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw new HttpsError('invalid-argument', `${key} is required and must be under ${maxLength} characters.`);
    }
    return value.trim();
  };
  const optionalText = (key, maxLength = 500) => {
    const value = application[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      throw new HttpsError('invalid-argument', `${key} must be under ${maxLength} characters.`);
    }
    return value.trim();
  };
  const allowedValue = (value, values, fieldName) => {
    if (!values.includes(value)) {
      throw new HttpsError('invalid-argument', `${fieldName} is invalid.`);
    }
    return value;
  };

  const firstName = requiredText('firstName', 100);
  const middleName = optionalText('middleName', 100);
  const lastName = requiredText('lastName', 100);
  const dateOfBirth = requiredText('dateOfBirth', 10);
  const email = requiredText('email', 254).toLowerCase();
  const mobileNumber = requiredText('mobileNumber', 30);
  const address = requiredText('address', 500);
  const city = requiredText('city', 100);
  const province = requiredText('province', 100);
  const postalCode = requiredText('postalCode', 20);
  const shopName = requiredText('shopName', 150);
  const sellerType = allowedValue(
    requiredText('sellerType', 40),
    ['individual', 'sole-proprietorship', 'partnership', 'corporation'],
    'Seller type',
  );
  const productCategory = allowedValue(
    requiredText('productCategory', 50),
    [
      'dry-goods', 'food-beverages', 'fashion-apparel', 'beauty-personal-care',
      'home-living', 'electronics-accessories', 'health-wellness',
      'jewelry-accessories', 'other',
    ],
    'Product category',
  );
  const storeDescription = requiredText('storeDescription', 500);
  const businessType = allowedValue(
    requiredText('businessType', 20),
    ['registered', 'individual'],
    'Business type',
  );
  const idType = allowedValue(
    requiredText('idType', 40),
    ['passport', 'drivers-license', 'philippine-national-id', 'umid', 'voters-id', 'other'],
    'Government-issued ID type',
  );
  const idNumber = requiredText('idNumber', 100);
  const signatureDate = requiredText('signatureDate', 10);
  const declarations = {
    accurate: application.declarationAccurate,
    productPolicy: application.declarationProductPolicy,
    platformPolicies: application.declarationPlatformPolicies,
    enforcement: application.declarationEnforcement,
    privacyConsent: application.declarationPrivacyConsent,
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
    || !/^\d{4}-\d{2}-\d{2}$/.test(signatureDate)
    || !/^\d+$/.test(postalCode)
    || Object.values(declarations).some((accepted) => accepted !== true)) {
    throw new HttpsError('invalid-argument', 'Check the contact details, dates, postal code, and required declarations.');
  }

  const dateIsValid = (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!dateIsValid(dateOfBirth) || !dateIsValid(signatureDate)) {
    throw new HttpsError('invalid-argument', 'Enter valid dates for date of birth and signature.');
  }

  const sellerName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const signatureFullName = requiredText('signatureFullName', 300);
  if (signatureFullName !== sellerName) {
    throw new HttpsError('invalid-argument', 'The signature name must match the seller name.');
  }

  const business = businessType === 'registered'
    ? {
      name: requiredText('businessName', 200),
      registrationType: allowedValue(
        requiredText('registrationType', 30),
        ['dti', 'sec', 'cooperative', 'other'],
        'Business registration type',
      ),
      registrationNumber: requiredText('registrationNumber', 100),
      taxIdentificationNumber: optionalText('taxIdentificationNumber', 50),
      address: requiredText('businessAddress', 500),
    }
    : null;

  const uploadRules = {
    profilePhoto: { required: false, types: ['image/jpeg', 'image/png', 'image/webp'] },
    storeLogo: { required: false, types: ['image/jpeg', 'image/png', 'image/webp'] },
    businessCertificate: { required: businessType === 'registered', types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
    idFront: { required: true, types: ['image/jpeg', 'image/png', 'image/webp'] },
    idBack: { required: true, types: ['image/jpeg', 'image/png', 'image/webp'] },
    selfieWithId: { required: false, types: ['image/jpeg', 'image/png', 'image/webp'] },
  };

  if (Object.keys(uploads).some((key) => !Object.hasOwn(uploadRules, key))) {
    throw new HttpsError('invalid-argument', 'One or more uploaded documents are invalid.');
  }

  const existingIdentity = existingApplication.identity || {};
  const existingFilePaths = {
    profilePhoto: existingApplication.profilePhoto,
    storeLogo: existingApplication.store?.logo,
    businessCertificate: existingApplication.businessCertificate,
    idFront: existingIdentity.idFront,
    idBack: existingIdentity.idBack,
    selfieWithId: existingIdentity.selfieWithId,
  };
  const filePaths = {};
  const bucket = getStorage().bucket();
  for (const [key, rules] of Object.entries(uploadRules)) {
    const uploadedPath = uploads[key];
    const path = uploadedPath || existingFilePaths[key];
    if (!path && !rules.required) continue;
    const originalPath = `seller-applications/${uid}/${applicationId}/${key}`;
    const pathSegments = typeof path === 'string' ? path.split('/') : [];
    const isVersionedUpload = pathSegments.length === 6
      && pathSegments[0] === 'seller-applications'
      && pathSegments[1] === uid
      && pathSegments[2] === applicationId
      && pathSegments[3] === 'updates'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(pathSegments[4])
      && pathSegments[5] === key;
    if (typeof path !== 'string'
      || (path !== originalPath && !isVersionedUpload)
      || (uploadedPath && !isEditing && uploadedPath !== originalPath)) {
      throw new HttpsError('invalid-argument', `Upload the required ${key} document.`);
    }

    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError('invalid-argument', `The uploaded ${key} document could not be found.`);
    }
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    if (!rules.types.includes(metadata.contentType) || !Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024) {
      throw new HttpsError('invalid-argument', `The ${key} file type or size is not supported.`);
    }
    filePaths[key] = path;
  }

  const applicationRecord = {
    userId: uid,
    status: isEditing ? 'under_review' : 'pending_review',
    seller: {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender: optionalText('gender', 40),
      mobileNumber,
      email,
      address,
      city,
      province,
      postalCode,
    },
    store: {
      name: shopName,
      logo: filePaths.storeLogo || null,
      sellerType,
      productCategory,
      description: storeDescription,
    },
    businessType,
    business,
    identity: {
      idType,
      idNumber,
      idFront: filePaths.idFront,
      idBack: filePaths.idBack,
      selfieWithId: filePaths.selfieWithId || null,
    },
    profilePhoto: filePaths.profilePhoto || null,
    businessCertificate: filePaths.businessCertificate || null,
    declarations,
    signature: { fullName: signatureFullName, date: signatureDate },
    ...(isEditing
      ? {
        createdAt: existingApplication.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        adminReview: {
          ...(existingApplication.adminReview || {}),
          verificationStatus: 'in_review',
          updatedAt: FieldValue.serverTimestamp(),
        },
      }
      : { createdAt: FieldValue.serverTimestamp() }),
  };

  await db().runTransaction(async (transaction) => {
    const existingApplication = await transaction.get(applicationRef);
    if (isEditing) {
      const currentRecord = existingApplication.data() || {};
      if (!existingApplication.exists || currentRecord.userId !== uid) {
        throw new HttpsError('not-found', 'Seller application not found.');
      }
      if (currentRecord.status !== 'needs_additional_documents') {
        throw new HttpsError(
          'failed-precondition',
          'This application is no longer waiting for additional information.',
        );
      }
      transaction.set(applicationRef, applicationRecord, { merge: true });
      return;
    }
    if (existingApplication.exists) {
      if (existingApplication.data()?.userId !== uid) {
        throw new HttpsError('permission-denied', 'This application cannot be accessed.');
      }
      return;
    }
    transaction.create(applicationRef, applicationRecord);
  });

  return { applicationId };
});

exports.getSellerApplicationStatus = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to view your seller application.');
  }

  const applications = await db()
    .collection('sellerApplications')
    .doc(request.auth.uid)
    .collection('applications')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (applications.empty) {
    return { application: null };
  }

  const document = applications.docs[0];
  const record = document.data();
  if (record.userId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'This application cannot be accessed.');
  }

  const seller = record.seller || {};
  const store = record.store || {};
  const identity = record.identity || {};
  const submittedAt = record.createdAt?.toDate?.();
  const rejectedAt = record.adminReview?.rejectedAt?.toDate?.();

  return {
    application: {
      applicationId: document.id,
      status: typeof record.status === 'string' ? record.status : 'pending_review',
      submittedAt: submittedAt instanceof Date ? submittedAt.toISOString() : null,
      rejectedAt: rejectedAt instanceof Date ? rejectedAt.toISOString() : null,
      rejectionReason: typeof record.adminReview?.rejectionReason === 'string'
        ? record.adminReview.rejectionReason
        : '',
      seller: {
        name: [seller.firstName, seller.middleName, seller.lastName]
          .filter((name) => typeof name === 'string' && name.trim())
          .join(' '),
        email: typeof seller.email === 'string' ? seller.email : '',
        mobileNumber: typeof seller.mobileNumber === 'string' ? seller.mobileNumber : '',
        address: [seller.address, seller.city, seller.province, seller.postalCode]
          .filter((part) => typeof part === 'string' && part.trim())
          .join(', '),
      },
      store: {
        name: typeof store.name === 'string' ? store.name : '',
        sellerType: typeof store.sellerType === 'string' ? store.sellerType : '',
        productCategory: typeof store.productCategory === 'string' ? store.productCategory : '',
        description: typeof store.description === 'string' ? store.description : '',
      },
      businessType: typeof record.businessType === 'string' ? record.businessType : '',
      identity: {
        idType: typeof identity.idType === 'string' ? identity.idType : '',
        idFrontSubmitted: Boolean(identity.idFront),
        idBackSubmitted: Boolean(identity.idBack),
        selfieSubmitted: Boolean(identity.selfieWithId),
      },
    },
  };
});

exports.getSellerApplicationForEdit = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to update your seller application.');
  }

  const applicationId = request.data?.applicationId;
  if (typeof applicationId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
    throw new HttpsError('invalid-argument', 'A valid seller application is required.');
  }

  const applicationRef = db()
    .collection('sellerApplications')
    .doc(request.auth.uid)
    .collection('applications')
    .doc(applicationId);
  const applicationSnapshot = await applicationRef.get();
  if (!applicationSnapshot.exists) {
    throw new HttpsError('not-found', 'Seller application not found.');
  }

  const record = applicationSnapshot.data() || {};
  if (record.userId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'This seller application cannot be accessed.');
  }
  if (record.status !== 'needs_additional_documents') {
    throw new HttpsError(
      'failed-precondition',
      'This application is not waiting for additional information.',
    );
  }

  const seller = record.seller || {};
  const store = record.store || {};
  const business = record.business || {};
  const identity = record.identity || {};
  const declarations = record.declarations || {};
  return {
    applicationId,
    application: {
      firstName: seller.firstName || '',
      middleName: seller.middleName || '',
      lastName: seller.lastName || '',
      dateOfBirth: seller.dateOfBirth || '',
      gender: seller.gender || '',
      mobileNumber: seller.mobileNumber || '',
      email: seller.email || '',
      address: seller.address || '',
      city: seller.city || '',
      province: seller.province || '',
      postalCode: seller.postalCode || '',
      shopName: store.name || '',
      sellerType: store.sellerType || '',
      productCategory: store.productCategory || '',
      storeDescription: store.description || '',
      businessType: record.businessType || '',
      businessName: business.name || '',
      registrationType: business.registrationType || '',
      registrationNumber: business.registrationNumber || '',
      taxIdentificationNumber: business.taxIdentificationNumber || '',
      businessAddress: business.address || '',
      idType: identity.idType || 'philippine-national-id',
      idNumber: identity.idNumber || '',
      declarationAccurate: declarations.accurate === true,
      declarationProductPolicy: declarations.productPolicy === true,
      declarationPlatformPolicies: declarations.platformPolicies === true,
      declarationEnforcement: declarations.enforcement === true,
      declarationPrivacyConsent: declarations.privacyConsent === true,
    },
    existingFiles: {
      profilePhoto: Boolean(record.profilePhoto),
      storeLogo: Boolean(store.logo),
      businessCertificate: Boolean(record.businessCertificate),
      idFront: Boolean(identity.idFront),
      idBack: Boolean(identity.idBack),
      selfieWithId: Boolean(identity.selfieWithId),
    },
  };
});

exports.getAdminSellerApplications = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const applicationCollection = db().collectionGroup('applications');
  const [pendingSnapshot, recentSnapshot] = await Promise.all([
    applicationCollection.where('status', 'in', [
      'pending_review',
      'under_review',
      'needs_additional_documents',
    ]).get(),
    applicationCollection.orderBy('createdAt', 'desc').limit(100).get(),
  ]);
  const isSellerApplication = (record) =>
    typeof record?.userId === 'string' &&
    record.seller &&
    typeof record.seller === 'object' &&
    record.store &&
    typeof record.store === 'object';
  const pendingCount = pendingSnapshot.docs.filter((document) =>
    isSellerApplication(document.data()),
  ).length;
  const applications = recentSnapshot.docs
    .filter((document) => isSellerApplication(document.data()))
    .map((document) => {
      const record = document.data();
      const seller = record.seller;
      const store = record.store;
      const identity = record.identity || {};
      const business = record.business || {};
      const signature = record.signature || {};
      const declarations = record.declarations || {};
      const submittedAt = record.createdAt?.toDate?.();
      const adminReview = record.adminReview || {};
      const approvedAt = adminReview.approvedAt?.toDate?.();
      const rejectedAt = adminReview.rejectedAt?.toDate?.();

      return {
        userId: record.userId,
        applicationId: document.id,
        applicationPath: document.ref.path,
        status: typeof record.status === 'string' ? record.status : 'pending_review',
        submittedAt: submittedAt instanceof Date ? submittedAt.toISOString() : null,
        adminReview: {
          verificationStatus: typeof adminReview.verificationStatus === 'string'
            ? adminReview.verificationStatus
            : 'pending',
          approvedBy: typeof adminReview.approvedBy === 'string' ? adminReview.approvedBy : '',
          reviewNotes: typeof adminReview.reviewNotes === 'string' ? adminReview.reviewNotes : '',
          approvedAt: approvedAt instanceof Date ? approvedAt.toISOString() : null,
          rejectedAt: rejectedAt instanceof Date ? rejectedAt.toISOString() : null,
          rejectionReason: typeof adminReview.rejectionReason === 'string'
            ? adminReview.rejectionReason
            : '',
          sellerRatingStatus: typeof adminReview.sellerRatingStatus === 'string'
            ? adminReview.sellerRatingStatus
            : 'not_rated',
          riskLevel: ['low', 'medium', 'high'].includes(adminReview.riskLevel)
            ? adminReview.riskLevel
            : 'low',
        },
        seller: {
          name: [seller.firstName, seller.middleName, seller.lastName]
            .filter((name) => typeof name === 'string' && name.trim())
            .join(' '),
          dateOfBirth: typeof seller.dateOfBirth === 'string' ? seller.dateOfBirth : '',
          gender: typeof seller.gender === 'string' ? seller.gender : '',
          email: typeof seller.email === 'string' ? seller.email : '',
          mobileNumber: typeof seller.mobileNumber === 'string' ? seller.mobileNumber : '',
          address: [seller.address, seller.city, seller.province, seller.postalCode]
            .filter((part) => typeof part === 'string' && part.trim())
            .join(', '),
        },
        store: {
          name: typeof store.name === 'string' ? store.name : '',
          logoSubmitted: Boolean(store.logo),
          sellerType: typeof store.sellerType === 'string' ? store.sellerType : '',
          productCategory: typeof store.productCategory === 'string' ? store.productCategory : '',
          description: typeof store.description === 'string' ? store.description : '',
        },
        businessType: typeof record.businessType === 'string' ? record.businessType : '',
        business: {
          name: typeof business.name === 'string' ? business.name : '',
          registrationType: typeof business.registrationType === 'string' ? business.registrationType : '',
          registrationNumber: typeof business.registrationNumber === 'string' ? business.registrationNumber : '',
          taxIdentificationNumber: typeof business.taxIdentificationNumber === 'string'
            ? business.taxIdentificationNumber
            : '',
          address: typeof business.address === 'string' ? business.address : '',
          certificateSubmitted: Boolean(record.businessCertificate),
        },
        identity: {
          idType: typeof identity.idType === 'string' ? identity.idType : '',
          idNumber: typeof identity.idNumber === 'string' ? identity.idNumber : '',
          idFrontSubmitted: Boolean(identity.idFront),
          idBackSubmitted: Boolean(identity.idBack),
          selfieSubmitted: Boolean(identity.selfieWithId),
        },
        signature: {
          fullName: typeof signature.fullName === 'string' ? signature.fullName : '',
          date: typeof signature.date === 'string' ? signature.date : '',
        },
        declarations: {
          accurate: Boolean(declarations.accurate),
          productPolicy: Boolean(declarations.productPolicy),
          platformPolicies: Boolean(declarations.platformPolicies),
          enforcement: Boolean(declarations.enforcement),
          privacyConsent: Boolean(declarations.privacyConsent),
        },
      };
    });

  return { pendingCount, applications };
});

exports.getAdminSellers = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const [sellerUsersSnapshot, activeApplicationsSnapshot] = await Promise.all([
    db().collection('users').where('seller', '==', true).get(),
    db().collectionGroup('applications')
      .where('status', '==', 'active_seller')
      .get(),
  ]);
  const sellerUsers = new Map(
    sellerUsersSnapshot.docs.map((document) => [document.id, document.data() || {}]),
  );
  const latestApplicationByUser = new Map();
  activeApplicationsSnapshot.docs.forEach((document) => {
    const record = document.data() || {};
    if (!sellerUsers.has(record.userId)
      || !record.seller || typeof record.seller !== 'object'
      || !record.store || typeof record.store !== 'object') {
      return;
    }

    const currentApplication = latestApplicationByUser.get(record.userId);
    const submittedAt = record.createdAt?.toDate?.();
    const currentSubmittedAt = currentApplication?.submittedAt?.toDate?.();
    if (!currentApplication
      || (submittedAt instanceof Date
        && (!(currentSubmittedAt instanceof Date) || submittedAt > currentSubmittedAt))) {
      latestApplicationByUser.set(record.userId, {
        ...record,
        applicationId: document.id,
      });
    }
  });

  const sellers = Array.from(sellerUsers, ([userId, userData]) => {
    const application = latestApplicationByUser.get(userId);
    const seller = application?.seller || {};
    const store = application?.store || {};
    const approvedAt = application?.adminReview?.approvedAt?.toDate?.();
    const submittedAt = application?.createdAt?.toDate?.();

    return {
      id: userId,
      name: userData.name
        || [seller.firstName || userData.firstName, seller.middleName || userData.middleName,
          seller.lastName || userData.lastName]
          .filter((name) => typeof name === 'string' && name.trim())
          .join(' ')
          .trim()
        || 'Unknown Seller',
      email: seller.email || userData.email || '',
      mobileNumber: seller.mobileNumber || userData.phone || '',
      seller: true,
      sellerId: typeof userData.sellerId === 'string' ? userData.sellerId : '',
      status: ['active', 'suspended', 'inactive'].includes(userData.status)
        ? userData.status
        : 'active',
      storeName: typeof store.name === 'string' ? store.name : '',
      productCategory: typeof store.productCategory === 'string' ? store.productCategory : '',
      applicationId: application?.applicationId || '',
      approvedAt: approvedAt instanceof Date ? approvedAt.toISOString() : null,
      submittedAt: submittedAt instanceof Date ? submittedAt.toISOString() : null,
    };
  });

  sellers.sort((first, second) => {
    const firstDate = first.approvedAt ? Date.parse(first.approvedAt) : 0;
    const secondDate = second.approvedAt ? Date.parse(second.approvedAt) : 0;
    return secondDate - firstDate || first.name.localeCompare(second.name);
  });

  return { sellers };
});

exports.updateAdminSellerStatus = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const userId = requireNonEmptyString(request.data?.userId, 'Seller ID');
  if (userId.length > 128 || userId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Seller ID is invalid.');
  }
  const status = request.data?.status;
  if (!['active', 'suspended', 'inactive'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Choose a valid seller status.');
  }

  const sellerRef = db().collection('users').doc(userId);
  const sellerSnapshot = await sellerRef.get();
  if (!sellerSnapshot.exists || sellerSnapshot.data()?.seller !== true) {
    throw new HttpsError('not-found', 'Seller account was not found.');
  }

  await sellerRef.update({
    status,
    sellerStatusUpdatedAt: FieldValue.serverTimestamp(),
    sellerStatusUpdatedBy: request.auth.uid,
  });

  return { success: true, userId, status };
});

exports.updateAdminSellerApplication = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const { applicationId, applicationPath, userId } = request.data || {};
  if (typeof userId !== 'string'
    || !userId.length
    || userId.length > 128
    || userId.includes('/')
    || typeof applicationId !== 'string'
    || !applicationId.length
    || applicationId.length > 150
    || applicationId.includes('/')
    || typeof applicationPath !== 'string'
    || !applicationPath.length
    || applicationPath.length > 1500) {
    throw new HttpsError('invalid-argument', 'A valid seller application is required.');
  }
  const applicationPathSegments = applicationPath.split('/');
  if (applicationPathSegments.some((segment) => !segment)
    || applicationPathSegments.length % 2 !== 0
    || applicationPathSegments.at(-2) !== 'applications'
    || applicationPathSegments.at(-1) !== applicationId
    || !applicationPathSegments.some((segment, index) =>
      segment === 'sellerApplications' && applicationPathSegments[index + 1] === userId)) {
    throw new HttpsError('invalid-argument', 'The seller application path is invalid.');
  }

  const requestedStatus = request.data?.status;
  const allowedStatuses = [
    'pending_review',
    'under_review',
    'needs_additional_documents',
    'approved',
    'active_seller',
    'rejected',
  ];
  if (typeof requestedStatus !== 'string' || !allowedStatuses.includes(requestedStatus)) {
    throw new HttpsError('invalid-argument', 'Select a valid application status.');
  }

  const requestInfo = request.data?.requestInfo;
  const requestableDocuments = {
    'id-front': 'Government ID — front',
    'id-back': 'Government ID — back',
    selfie: 'Selfie with ID',
    'business-certificate': 'Business certificate',
  };
  let requestedItems = [];
  let additionalInfo = '';
  if (requestedStatus === 'needs_additional_documents') {
    if (!requestInfo || typeof requestInfo !== 'object'
      || !Array.isArray(requestInfo.requestedItems)
      || requestInfo.requestedItems.length === 0
      || requestInfo.requestedItems.length > Object.keys(requestableDocuments).length
      || requestInfo.requestedItems.some((item) =>
        typeof item !== 'string' || !Object.hasOwn(requestableDocuments, item))
      || new Set(requestInfo.requestedItems).size !== requestInfo.requestedItems.length
      || (requestInfo.message !== undefined
        && (typeof requestInfo.message !== 'string' || requestInfo.message.length > 1500))) {
      throw new HttpsError('invalid-argument', 'Select valid missing requirements and provide a valid message.');
    }
    requestedItems = requestInfo.requestedItems;
    additionalInfo = typeof requestInfo.message === 'string'
      ? requestInfo.message.trim()
      : '';
  } else if (requestInfo !== undefined) {
    throw new HttpsError('invalid-argument', 'Additional-document details require the matching application status.');
  }

  const incomingReview = request.data?.adminReview || {};
  const verificationStatuses = [
    'pending',
    'in_review',
    'verified',
    'failed',
    'additional_documents_required',
  ];
  const verificationStatus = incomingReview.verificationStatus;
  const sellerRatingStatus = incomingReview.sellerRatingStatus;
  const riskLevel = incomingReview.riskLevel;
  const reviewNotes = typeof incomingReview.reviewNotes === 'string'
    ? incomingReview.reviewNotes.trim()
    : '';
  const rejectionReason = typeof incomingReview.rejectionReason === 'string'
    ? incomingReview.rejectionReason.trim()
    : '';

  if (!verificationStatuses.includes(verificationStatus)
    || typeof sellerRatingStatus !== 'string'
    || sellerRatingStatus.trim().length > 80
    || !['low', 'medium', 'high'].includes(riskLevel)
    || reviewNotes.length > 2000
    || rejectionReason.length > 1000) {
    throw new HttpsError('invalid-argument', 'One or more review fields are invalid.');
  }
  if (requestedStatus === 'rejected' && !rejectionReason) {
    throw new HttpsError('invalid-argument', 'Provide a rejection reason before rejecting.');
  }
  if (requestedStatus === 'needs_additional_documents'
    && verificationStatus !== 'additional_documents_required') {
    throw new HttpsError(
      'invalid-argument',
      'Set verification status to additional documents required before requesting documents.',
    );
  }

  const applicationRef = db().doc(applicationPath);
  const messageRef = [
    'needs_additional_documents',
    'approved',
    'active_seller',
    'rejected',
  ].includes(requestedStatus)
    ? db().collection('users').doc(userId).collection('messages').doc()
    : null;
  const userRef = db().collection('users').doc(userId);
  const sellerIdSequenceRef = db().collection('system').doc('sellerIdSequence');
  const [adminSnapshot, authUser] = await Promise.all([
    db().collection('users').doc(request.auth.uid).get(),
    getAuth().getUser(request.auth.uid),
  ]);
  const adminData = adminSnapshot.data() || {};
  const adminName = typeof adminData.name === 'string' && adminData.name.trim()
    ? adminData.name.trim()
    : authUser.email || request.auth.uid;

  return db().runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!applicationSnapshot.exists) {
      throw new HttpsError('not-found', 'Seller application not found.');
    }

    const record = applicationSnapshot.data() || {};
    if (record.userId !== userId || !record.seller || !record.store) {
      throw new HttpsError('permission-denied', 'This seller application cannot be updated.');
    }
    const currentStatus = record.status || 'pending_review';
    const transitions = {
      pending_review: ['under_review', 'needs_additional_documents'],
      under_review: ['needs_additional_documents', 'approved', 'rejected'],
      needs_additional_documents: ['under_review', 'approved', 'rejected'],
      approved: ['active_seller'],
      active_seller: [],
      rejected: [],
    };
    if (requestedStatus !== currentStatus
      && !transitions[currentStatus]?.includes(requestedStatus)) {
      throw new HttpsError(
        'failed-precondition',
        'This application cannot move to the selected status from its current status.',
      );
    }
    if ((requestedStatus === 'approved'
      || (requestedStatus === 'active_seller' && currentStatus === 'approved'))
      && verificationStatus !== 'verified') {
      throw new HttpsError(
        'failed-precondition',
        'Verify the seller documents before approving and activating the seller.',
      );
    }
    if ((requestedStatus === 'approved'
      || (requestedStatus === 'active_seller' && currentStatus === 'approved'))
      && (!record.identity?.idFront
        || !record.identity?.idBack
        || (record.businessType === 'registered' && !record.businessCertificate))) {
      throw new HttpsError(
        'failed-precondition',
        'Required seller documents are missing. Request the missing documents before approving.',
      );
    }

    const isApproval = requestedStatus === 'approved'
      || (requestedStatus === 'active_seller' && currentStatus === 'approved');
    const nextStatus = isApproval ? 'active_seller' : requestedStatus;
    const userSnapshot = isApproval ? await transaction.get(userRef) : null;
    const existingSellerId = userSnapshot?.data()?.sellerId;
    const needsSellerId = isApproval
      && !(typeof existingSellerId === 'string' && /^#SLR-\d{4,}$/.test(existingSellerId));
    const sequenceSnapshot = needsSellerId
      ? await transaction.get(sellerIdSequenceRef)
      : null;
    let sellerId = typeof existingSellerId === 'string' && /^#SLR-\d{4,}$/.test(existingSellerId)
      ? existingSellerId
      : '';
    if (needsSellerId) {
      const lastIssued = Number(sequenceSnapshot?.data()?.lastIssued || 0);
      if (!Number.isSafeInteger(lastIssued)
        || lastIssued < 0
        || !Number.isSafeInteger(lastIssued + 1)) {
        throw new HttpsError('failed-precondition', 'Seller ID sequence is invalid.');
      }
      sellerId = `#SLR-${String(lastIssued + 1).padStart(4, '0')}`;
    }

    const existingReview = record.adminReview || {};
    const existingApprovedAt = existingReview.approvedAt?.toDate?.();
    const existingRejectedAt = existingReview.rejectedAt?.toDate?.();
    const reviewUpdate = {
      verificationStatus,
      approvedBy: isApproval ? adminName : (existingReview.approvedBy || ''),
      reviewNotes,
      approvedAt: isApproval
        ? FieldValue.serverTimestamp()
        : (existingReview.approvedAt || null),
      rejectedAt: nextStatus === 'rejected'
        ? (existingReview.rejectedAt || FieldValue.serverTimestamp())
        : (existingReview.rejectedAt || null),
      rejectionReason: nextStatus === 'rejected' ? rejectionReason : '',
      sellerRatingStatus: sellerRatingStatus.trim() || 'not_rated',
      riskLevel,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(applicationRef, {
      status: nextStatus,
      adminReview: reviewUpdate,
    }, { merge: true });

    const isApprovalMessage = isApproval && currentStatus !== 'active_seller';
    if (messageRef
      && (requestedStatus === 'needs_additional_documents'
        || requestedStatus === 'rejected'
        || isApprovalMessage)) {
      const sellerName = [
        record.seller.firstName,
        record.seller.middleName,
        record.seller.lastName,
      ].filter((name) => typeof name === 'string' && name.trim())
        .join(' ')
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 300) || 'Seller';
      const storeName = typeof record.store.name === 'string' && record.store.name.trim()
        ? record.store.name.trim()
        : 'your store';
      const messageStoreName = storeName.replace(/[\r\n]+/g, ' ').slice(0, 150);
      const isRejection = requestedStatus === 'rejected';
      const messageType = isRejection
        ? 'seller_application_rejection'
        : isApprovalMessage
          ? 'seller_application_approval'
          : 'seller_application_message';
      const title = isRejection
        ? `Seller application decision for ${messageStoreName}`
        : isApprovalMessage
          ? `Your seller application for ${messageStoreName} was approved`
          : `Additional information needed for ${messageStoreName}`;
      const message = isRejection
        ? [
          `Hello ${sellerName},`,
          '',
          `After reviewing your application to become a seller for ${messageStoreName}, we regret to inform you that your application has been rejected.`,
          '',
          `Reason: ${rejectionReason}`,
          '',
          'If you have questions about this decision, please contact support.',
          '',
          'Gemstone Seller Application Team',
        ].join('\n')
        : isApprovalMessage
          ? [
            `Hello ${sellerName},`,
            '',
            `Good news! Your application to become a seller for ${messageStoreName} has been approved.`,
            '',
            `Your Seller ID is ${sellerId}.`,
            'Your seller account is now active. Welcome to Gemstone Marketplace!',
            '',
            'Thank you,',
            'Gemstone Seller Application Team',
          ].join('\n')
          : [
            `Hello ${sellerName},`,
            '',
            `We reviewed your application for ${messageStoreName} and need the following additional information or documents:`,
            ...requestedItems.map((item) => `- ${requestableDocuments[item]}`),
            '',
            additionalInfo,
            '',
            'Please open your seller application and provide the requested items so we can continue reviewing it.',
            '',
            'If you have already updated your application, you may disregard this message.',
            '',
            'Thank you,',
            'Gemstone Seller Application Team',
          ].filter(Boolean).join('\n');

      transaction.create(messageRef, {
        type: messageType,
        applicationId,
        title,
        message,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    if (nextStatus === 'active_seller') {
      transaction.set(userRef, { seller: true, ...(sellerId ? { sellerId } : {}) }, { merge: true });
      if (needsSellerId) {
        transaction.set(sellerIdSequenceRef, {
          lastIssued: Number(sequenceSnapshot?.data()?.lastIssued || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    return {
      status: nextStatus,
      ...(sellerId ? { sellerId } : {}),
      messageSent: Boolean(messageRef),
      adminReview: {
        ...reviewUpdate,
        approvedAt: isApproval
          ? new Date().toISOString()
          : (existingApprovedAt instanceof Date ? existingApprovedAt.toISOString() : null),
        rejectedAt: nextStatus === 'rejected'
          ? (existingRejectedAt instanceof Date
            ? existingRejectedAt.toISOString()
            : new Date().toISOString())
          : (existingRejectedAt instanceof Date ? existingRejectedAt.toISOString() : null),
      },
    };
  });
});

exports.registerPushToken = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  if (!token || token.length > 4096) {
    throw new HttpsError('invalid-argument', 'A valid push token is required.');
  }

  const tokenId = crypto.createHash('sha256').update(token).digest('hex');
  await db().collection('users').doc(request.auth.uid).collection('pushTokens').doc(tokenId).set({
    token,
    updatedAt: new Date().toISOString(),
  });

  return { registered: true };
});

async function sendUserPushNotification(userRef, { title, body, route = '/notifications', data = {} }) {
  try {
    const tokenSnapshot = await userRef.collection('pushTokens').get();
    const tokenDocuments = tokenSnapshot.docs.filter((document) => typeof document.data()?.token === 'string');
    if (tokenDocuments.length === 0) {
      logger.warn('No registered web push tokens for user; push notification skipped.', {
        userId: userRef.id,
      });
      return { tokenCount: 0, successCount: 0, failedCount: 0, deliveryFailed: false };
    }
    let successCount = 0;
    let failedCount = 0;
    const messageData = Object.fromEntries(
      Object.entries({ title, body, route, ...data })
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );

    for (let start = 0; start < tokenDocuments.length; start += 500) {
      const batch = tokenDocuments.slice(start, start + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((document) => document.data().token),
        data: messageData,
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title,
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
          },
        },
      });
      successCount += response.successCount;
      failedCount += response.failureCount;
      response.responses.forEach((result) => {
        if (!result.success) {
          logger.warn('Web push delivery failed for a registered token.', {
            userId: userRef.id,
            errorCode: result.error?.code || 'unknown',
          });
        }
      });

      const staleTokenDeletes = response.responses.flatMap((result, index) => (
        !result.success && [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
        ].includes(result.error?.code)
          ? [batch[index].ref.delete()]
          : []
      ));
      await Promise.all(staleTokenDeletes);
    }
    return {
      tokenCount: tokenDocuments.length,
      successCount,
      failedCount,
      deliveryFailed: false,
    };
  } catch (error) {
    logger.error('Unable to send user push notification:', error);
    return { tokenCount: 0, successCount: 0, failedCount: 1, deliveryFailed: true };
  }
}

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

  const suppliedDeliveryInformation = request.data?.deliveryInformation;
  if (!suppliedDeliveryInformation || typeof suppliedDeliveryInformation !== 'object'
    || Array.isArray(suppliedDeliveryInformation)) {
    throw new HttpsError('invalid-argument', 'Delivery information is required.');
  }
  const deliveryFieldLimits = {
    recipientName: 120,
    phone: 40,
    addressLine1: 200,
    addressLine2: 200,
    city: 120,
    province: 120,
    postalCode: 20,
  };
  const deliveryInformation = {};
  for (const [field, maxLength] of Object.entries(deliveryFieldLimits)) {
    const value = suppliedDeliveryInformation[field];
    if (value === undefined && field === 'addressLine2') {
      deliveryInformation[field] = '';
      continue;
    }
    if (typeof value !== 'string' || value.trim().length > maxLength
      || (field !== 'addressLine2' && !value.trim())) {
      throw new HttpsError('invalid-argument', 'Complete the required delivery information fields.');
    }
    deliveryInformation[field] = value.trim();
  }

  const userRef = db().collection('users').doc(request.auth.uid);
  const purchaseRef = db().collection('purchases').doc();
  const now = new Date().toISOString();
  const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  const receiptId = `RCPT-${suffix}`;
  const transactionId = `TXN-${suffix}`;
  const invoiceNo = `INV-${suffix}`;
  const total = selectedPackage.price;
  const expiresAt = new Date(Date.now() + (45 * 24 * 60 * 60 * 1000)).toISOString();
  const nextRewardAt = nextManilaRewardAt();
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

  const recipientNotificationRefs = distributionRecipients.map(({ document, role }) => ({
    userRef: document.ref,
    userId: document.id,
    role,
    notificationRef: document.ref.collection('notifications').doc(`purchase-${purchaseRef.id}-${role}`),
  }));

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
    const purchaseDayKey = manilaDateKey(new Date(now));
    const firstDailyRewardRef = userRef.collection('gemTransactions').doc(`daily-${purchaseRef.id}-${purchaseDayKey}`);
    const firstDailyRewardNotificationRef = userRef.collection('notifications').doc(`daily-${purchaseRef.id}-${purchaseDayKey}`);
    const purchaserRewardRef = userRef.collection('gemTransactions').doc(`${purchaseRef.id}-membership`);
    const purchaserNotificationRef = userRef.collection('notifications').doc(`purchase-${purchaseRef.id}`);
    const purchasedDailyRewardSnapshot = await transaction.get(firstDailyRewardRef);

    transaction.update(userRef, {
      walletBalance: walletBalance - total,
      gemPoints: (Number.isFinite(currentGemPoints) ? currentGemPoints : 0) + selectedPackage.dailyGemReward,
      membershipTier: selectedPackage.tier,
      membershipPurchaseId: purchaseRef.id,
      membershipStartedAt: now,
      membershipExpiresAt: expiresAt,
      dailyGemReward: selectedPackage.dailyGemReward,
      dailyDistributionReward: selectedPackage.distributionReward,
      nextGemRewardAt: nextRewardAt,
      membershipStatus: 'active',
      hasNotifications: true,
      updatedAt: now,
    });

    if (!purchasedDailyRewardSnapshot.exists) {
      transaction.set(firstDailyRewardRef, {
        type: 'daily_membership_reward',
        amount: selectedPackage.dailyGemReward,
        earningNumber: 1,
        tier: selectedPackage.tier,
        source: 'purchase_first_day',
        dayNumber: 1,
        purchaseId: purchaseRef.id,
        createdAt: now,
      });
      transaction.set(firstDailyRewardNotificationRef, {
        type: 'daily_membership_reward',
        title: '🎉 Congratulations! You’ve Earned Cashback!',
        message: 'Your cashback has been successfully added to your GEM Points.',
        amount: selectedPackage.dailyGemReward,
        dayNumber: 1,
        purchaseId: purchaseRef.id,
        read: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    transaction.set(purchaserRewardRef, {
      type: 'membership_activation_reward',
      amount: selectedPackage.dailyGemReward,
      tier: selectedPackage.tier,
      purchaseId: purchaseRef.id,
      createdAt: now,
    });
    transaction.set(purchaserNotificationRef, {
      type: 'membership_purchase',
      title: 'Payment Confirmed',
      message: `Your ${selectedPackage.name} purchase has been confirmed successfully. ${selectedPackage.dailyGemReward} GEM reward has been added to your account.`,
      amount: selectedPackage.dailyGemReward,
        dayNumber: 1,
      read: false,
      purchaseId: purchaseRef.id,
      createdAt: now,
      updatedAt: now,
    });

    distribution.forEach(({ snapshot, rewardRef, rewardExists, amount, role }, index) => {
      if (!snapshot.exists || rewardExists) return;
      const recipientData = snapshot.data() || {};
      const recipientGemPoints = Number(recipientData.gemPoints || 0);
      transaction.update(snapshot.ref, {
        gemPoints: (Number.isFinite(recipientGemPoints) ? recipientGemPoints : 0) + amount,
        hasNotifications: true,
        updatedAt: now,
      });
      transaction.set(rewardRef, {
        type: 'purchase_distribution',
        amount,
        earningNumber: 1,
        dayNumber: 1,
        role,
        purchaseId: purchaseRef.id,
        sourceUserId: request.auth.uid,
        tier: selectedPackage.tier,
        createdAt: now,
      });
      const recipientNotificationRef = recipientNotificationRefs[index].notificationRef;
      transaction.set(recipientNotificationRef, {
        type: 'purchase_distribution',
        title: 'GEM Distribution Received',
        message: `Day 1: You received ${amount} GEM${amount === 1 ? '' : 's'} from ${userData.name || userData.username || request.auth.uid}'s ${selectedPackage.name} purchase.`,
        amount,
        dayNumber: 1,
        role,
        sourceUserId: request.auth.uid,
        read: false,
        purchaseId: purchaseRef.id,
        createdAt: now,
        updatedAt: now,
      });
    });
    transaction.set(purchaseRef, {
      userId: request.auth.uid,
      customerName: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email || request.auth.token.email || '',
      deliveryInformation,
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
      membershipStartedAt: now,
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

  await sendUserPushNotification(userRef, {
    title: 'Payment Confirmed',
    body: `Your ${selectedPackage.name} purchase has been confirmed successfully. ${selectedPackage.dailyGemReward} GEM reward has been added to your account.`,
    data: { purchaseId: purchaseRef.id },
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

exports.createDeposit = onCall({
  region: 'asia-southeast1',
  secrets: [PAYMONGO_SECRET_KEY],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const amount = Number(request.data?.amount);
  const amountInCentavos = Math.round(amount * 100);
  if (!Number.isFinite(amount)
    || amount < 1
    || Math.abs(amount - Number(amount.toFixed(2))) > 1e-8
    || amountInCentavos < DEPOSIT_MINIMUM_CENTAVOS) {
    throw new HttpsError('invalid-argument', 'Enter a deposit amount of at least PHP 1.00 with up to two decimal places.');
  }

  const requestId = typeof request.data?.requestId === 'string'
    ? request.data.requestId.trim()
    : '';
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid deposit request ID is required.');
  }

  const secretKey = PAYMONGO_SECRET_KEY.value().trim();
  if (!/^sk_(test|live)_/.test(secretKey)) {
    throw new HttpsError('failed-precondition', 'PayMongo secret key is not configured.');
  }

  const uid = request.auth.uid;
  const userRef = db().collection('users').doc(uid);
  const depositId = `${uid}_${requestId}`;
  const depositRef = db().collection('deposits').doc(depositId);
  const now = new Date().toISOString();
  const referenceNo = `DEP-${manilaDateKey(new Date()).replace(/-/g, '')}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const deposit = await db().runTransaction(async (transaction) => {
    const [userSnapshot, depositSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(depositRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Your user account could not be found.');
    }

    if (depositSnapshot.exists) {
      const existingDeposit = depositSnapshot.data() || {};
      if (existingDeposit.uid !== uid) {
        throw new HttpsError('already-exists', 'This deposit request ID is already in use.');
      }
      if (Number(existingDeposit.amountInCentavos) !== amountInCentavos) {
        throw new HttpsError('already-exists', 'This deposit request ID was already used for a different amount.');
      }
      if (existingDeposit.checkoutUrl) {
        return existingDeposit;
      }
      return existingDeposit;
    }

    const userData = userSnapshot.data() || {};
    const record = {
      depositId,
      requestId,
      referenceNo,
      uid,
      userName: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' '),
      userEmail: userData.email || request.auth.token.email || '',
      amount: Number(amount.toFixed(2)),
      amountInCentavos,
      checkoutSessionId: null,
      currency: 'PHP',
      status: 'pending',
      livemode: secretKey.startsWith('sk_live_'),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(depositRef, record);
    return record;
  });

  if (deposit.checkoutUrl) {
    return {
      success: true,
      requestId,
      referenceNo: deposit.referenceNo,
      checkoutSessionId: deposit.checkoutSessionId,
      checkoutUrl: deposit.checkoutUrl,
      amount: deposit.amount,
      status: deposit.status,
    };
  }

  const userSnapshot = await userRef.get();
  const userData = userSnapshot.data() || {};
  const checkoutPayload = {
    data: {
      attributes: {
        line_items: [{
          currency: 'PHP',
          amount: deposit.amountInCentavos,
          name: 'Wallet Deposit',
          quantity: 1,
        }],
        payment_method_types: ['qrph'],
        description: 'Gemstone Code wallet deposit',
        customer_email: deposit.userEmail || userData.email || undefined,
        reference_number: deposit.referenceNo,
        metadata: {
          firebase_uid: uid,
          deposit_request_id: requestId,
          deposit_id: depositId,
          deposit_reference: deposit.referenceNo,
        },
        success_url: `https://gemstonecode.store/exchange/deposit?payment=success&depositId=${encodeURIComponent(depositId)}`,
        cancel_url: `https://gemstonecode.store/exchange/deposit?payment=cancelled&depositId=${encodeURIComponent(depositId)}`,
        show_line_items: true,
      },
    },
  };

  let checkoutResponse;
  try {
    checkoutResponse = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.createHash('sha256').update(`${uid}:${requestId}`).digest('hex'),
      },
      body: JSON.stringify(checkoutPayload),
    });
  } catch (error) {
    logger.error('Unable to reach PayMongo Checkout API.', { requestId, error: error.message });
    throw new HttpsError('unavailable', 'PayMongo checkout is temporarily unavailable. Please try again.');
  }

  const checkoutResult = await checkoutResponse.json().catch(() => ({}));
  if (!checkoutResponse.ok) {
    logger.error('PayMongo Checkout API rejected a deposit request.', {
      requestId,
      status: checkoutResponse.status,
      error: checkoutResult.errors?.[0]?.detail || 'Unknown PayMongo error',
    });
    throw new HttpsError('failed-precondition', checkoutResult.errors?.[0]?.detail || 'PayMongo could not create this checkout session.');
  }

  const checkoutSession = checkoutResult.data;
  const checkoutUrl = checkoutSession?.attributes?.checkout_url;
  if (typeof checkoutSession?.id !== 'string'
    || typeof checkoutUrl !== 'string'
    || !checkoutUrl.startsWith('https://checkout.paymongo.com/')) {
    logger.error('PayMongo returned an invalid checkout session response.', { requestId });
    throw new HttpsError('internal', 'PayMongo returned an invalid checkout session. Please try again.');
  }

  const updatedAt = new Date().toISOString();
  const checkoutUpdate = {
    checkoutSessionId: checkoutSession.id,
    checkoutUrl,
    updatedAt,
  };
  await depositRef.set(checkoutUpdate, { merge: true });

  return {
    success: true,
    requestId,
    referenceNo: deposit.referenceNo,
    checkoutSessionId: checkoutSession.id,
    checkoutUrl,
    amount: deposit.amount,
    status: 'pending',
  };
});

exports.getDepositStatus = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const depositId = typeof request.data?.depositId === 'string'
    ? request.data.depositId.trim()
    : '';
  if (!depositId || depositId.length > 180 || depositId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid deposit ID is required.');
  }

  const snapshot = await db().collection('deposits').doc(depositId).get();
  if (!snapshot.exists || snapshot.data()?.uid !== request.auth.uid) {
    throw new HttpsError('not-found', 'This deposit could not be found.');
  }

  const deposit = snapshot.data() || {};
  const createdAt = deposit.createdAt?.toDate
    ? deposit.createdAt.toDate().toISOString()
    : deposit.createdAt || null;
  return {
    depositId: snapshot.id,
    referenceNo: deposit.referenceNo || '',
    amount: Number(deposit.amount || 0),
    status: deposit.status || 'pending',
    createdAt,
  };
});

exports.paymongoWebhook = onRequest({
  region: 'asia-southeast1',
  secrets: [PAYMONGO_WEBHOOK_SECRET],
}, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed.');
    return;
  }

  const webhookSecret = PAYMONGO_WEBHOOK_SECRET.value();
  if (!webhookSecret || !request.rawBody) {
    response.status(500).send('Webhook is not configured.');
    return;
  }

  const signatureHeader = request.get('X-Paymongo-Signature') || request.get('Paymongo-Signature') || '';
  const signatureParts = new Map(signatureHeader.split(',').map((part) => {
    const separator = part.indexOf('=');
    return separator > 0
      ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
      : ['', ''];
  }).filter(([key]) => key));
  const timestamp = signatureParts.get('t') || '';
  const livemode = request.body?.data?.attributes?.livemode;
  const signatures = livemode === true
    ? [signatureParts.get('li')]
    : livemode === false
      ? [signatureParts.get('te')]
      : [signatureParts.get('te'), signatureParts.get('li')];
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`), request.rawBody]))
    .digest();
  const signatureIsValid = /^\d+$/.test(timestamp) && signatures.some((signature) => {
    if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expectedSignature.length
      && crypto.timingSafeEqual(supplied, expectedSignature);
  });
  if (!signatureIsValid) {
    response.status(401).send('Invalid webhook signature.');
    return;
  }

  const event = request.body?.data;
  const eventId = event?.id;
  const eventAttributes = event?.attributes || {};
  const eventType = eventAttributes.type;
  const resource = eventAttributes.data || {};
  const resourceAttributes = resource.attributes || {};
  const metadata = resourceAttributes.metadata || {};
  const receivedAt = new Date().toISOString();

  if (typeof eventId !== 'string' || !eventId) {
    response.status(400).send('Missing PayMongo event ID.');
    return;
  }

  const eventRef = db().collection('paymongoWebhookEvents').doc(eventId);
  const paymentEventTypes = new Set([
    'checkout_session.payment.paid',
    'payment.paid',
    'payment.failed',
    'payment.refunded',
  ]);
  const payoutEventTypes = new Set(['payout.deposited', 'payout.returned']);

  if (payoutEventTypes.has(eventType)) {
    const payoutId = resource.id;
    if (typeof payoutId !== 'string' || !payoutId) {
      response.status(400).send('Missing PayMongo payout ID.');
      return;
    }

    const payoutRef = db().collection('paymongoPayouts').doc(payoutId);
    const payoutStatus = eventType === 'payout.deposited' ? 'deposited' : 'returned';
    const payoutRecord = {
      paymongoPayoutId: payoutId,
      status: payoutStatus,
      amount: Number(resourceAttributes.net_amount ?? resourceAttributes.amount ?? 0),
      currency: resourceAttributes.currency || 'PHP',
      referenceNo: resourceAttributes.reference_number
        || resourceAttributes.last_payout_transfer?.reference_number
        || '',
      bankName: resourceAttributes.bank_name || '',
      updatedAt: receivedAt,
      lastEventId: eventId,
      lastEventType: eventType,
    };
    const payoutResult = await db().runTransaction(async (transaction) => {
      const [existingEvent, existingPayout] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(payoutRef),
      ]);
      if (existingEvent.exists) return { duplicate: true };

      transaction.set(payoutRef, {
        ...payoutRecord,
        createdAt: existingPayout.data()?.createdAt || receivedAt,
      }, { merge: true });
      transaction.create(eventRef, {
        eventId,
        eventType,
        livemode: eventAttributes.livemode === true,
        resourceId: payoutId,
        processedAt: receivedAt,
        result: payoutStatus,
      });
      return { duplicate: false };
    });
    response.status(200).json({ received: true, duplicate: payoutResult.duplicate, status: payoutStatus });
    return;
  }

  if (!paymentEventTypes.has(eventType)) {
    await eventRef.create({
      eventId,
      eventType: eventType || 'unknown',
      livemode: eventAttributes.livemode === true,
      resourceId: resource.id || '',
      processedAt: receivedAt,
      result: 'ignored',
    }).catch((error) => {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
    });
    response.status(200).json({ received: true, ignored: true });
    return;
  }

  const requestId = metadata.deposit_request_id;
  const firebaseUid = metadata.firebase_uid;
  const metadataDepositId = metadata.deposit_id;
  const referenceNo = resourceAttributes.reference_number
    || resourceAttributes.external_reference_number
    || metadata.deposit_reference
    || '';
  const checkoutSessionId = resource.type === 'checkout_session'
    ? resource.id
    : resourceAttributes.checkout_session_id || metadata.checkout_session_id || '';
  const paymentId = resource.type === 'payment' ? resource.id : '';
  let depositRef = null;
  let depositSnapshot = null;
  let isLegacyDeposit = false;

  if (typeof metadataDepositId === 'string'
    && /^[A-Za-z0-9_-]{1,180}$/.test(metadataDepositId)) {
    depositRef = db().collection('deposits').doc(metadataDepositId);
    depositSnapshot = await depositRef.get();
  }
  if (!depositSnapshot?.exists
    && typeof firebaseUid === 'string'
    && typeof requestId === 'string'
    && /^[A-Za-z0-9_-]{1,128}$/.test(firebaseUid)
    && /^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
    depositRef = db().collection('deposits').doc(`${firebaseUid}_${requestId}`);
    depositSnapshot = await depositRef.get();
    if (!depositSnapshot.exists) {
      depositRef = db().collection('depositRequests').doc(`${firebaseUid}-${requestId}`);
      depositSnapshot = await depositRef.get();
      isLegacyDeposit = depositSnapshot.exists;
    }
  }
  const depositLookupFields = [
    ['referenceNo', referenceNo.startsWith('DEP-') ? referenceNo : ''],
    ['checkoutSessionId', checkoutSessionId],
    ['paymongoPaymentId', paymentId],
  ];
  for (const [field, value] of depositLookupFields) {
    if (depositSnapshot?.exists || !value) continue;
    for (const collectionName of ['deposits', 'depositRequests']) {
      const match = await db().collection(collectionName)
        .where(field, '==', value)
        .limit(1)
        .get();
      if (!match.empty) {
        depositSnapshot = match.docs[0];
        depositRef = match.docs[0].ref;
        isLegacyDeposit = collectionName === 'depositRequests';
        break;
      }
    }
  }

  if (!depositRef || !depositSnapshot?.exists) {
    logger.warn('PayMongo payment event has no matching deposit request.', {
      eventId,
      eventType,
      referenceNo,
      resourceId: resource.id || '',
    });
    await eventRef.create({
      eventId,
      eventType,
      livemode: eventAttributes.livemode === true,
      resourceId: resource.id || '',
      referenceNo,
      processedAt: receivedAt,
      result: 'unmatched',
    }).catch((error) => {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
    });
    response.status(200).json({ received: true, unmatched: true });
    return;
  }

  const result = await db().runTransaction(async (transaction) => {
    const [existingEvent, currentDepositSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(depositRef),
    ]);
    if (existingEvent.exists) return { duplicate: true };
    if (!currentDepositSnapshot.exists) {
      transaction.create(eventRef, {
        eventId,
        eventType,
        livemode: eventAttributes.livemode === true,
        resourceId: resource.id || '',
        referenceNo,
        processedAt: receivedAt,
        result: 'missing_deposit',
      });
      return { duplicate: false, ignored: true };
    }

    const deposit = currentDepositSnapshot.data() || {};
    const depositUid = deposit.uid || deposit.userId;
    const userRef = db().collection('users').doc(depositUid);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Deposit owner could not be found.');
    }
    const userData = userSnapshot.data() || {};
    const walletBalance = Number(userData.walletBalance ?? userData.balance ?? 0);
    const expectedAmountInCentavos = Number(deposit.amountInCentavos);
    if (!Number.isFinite(walletBalance)
      || !Number.isFinite(expectedAmountInCentavos)
      || expectedAmountInCentavos < DEPOSIT_MINIMUM_CENTAVOS) {
      throw new HttpsError('failed-precondition', 'Deposit or wallet balance is invalid.');
    }
    if (typeof eventAttributes.livemode === 'boolean'
      && eventAttributes.livemode !== (deposit.livemode === true)) {
      throw new HttpsError('failed-precondition', 'PayMongo event mode does not match the stored deposit request.');
    }
    if (checkoutSessionId && deposit.checkoutSessionId !== checkoutSessionId) {
      throw new HttpsError('failed-precondition', 'PayMongo checkout session does not match the stored deposit request.');
    }
    const eventAmount = Number(resourceAttributes.amount);
    if ((eventType === 'payment.paid' || eventType === 'checkout_session.payment.paid')
      && Number.isFinite(eventAmount)
      && eventAmount !== expectedAmountInCentavos) {
      throw new HttpsError('failed-precondition', 'PayMongo payment amount does not match the stored deposit request.');
    }

    const depositAmount = Number(deposit.amount);
    const notificationRef = userRef.collection('notifications').doc(`deposit-${deposit.requestId}`);
    let walletTransaction = null;
    let nextStatus = deposit.status;
    let walletBalanceAfter = walletBalance;
    let balanceDelta = 0;
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'info';
    const depositUpdate = { updatedAt: receivedAt };

    if (eventType === 'checkout_session.payment.paid' || eventType === 'payment.paid') {
      if (['paid', 'partially_refunded', 'refunded'].includes(deposit.status)) {
        transaction.create(eventRef, {
          eventId,
          eventType,
          livemode: eventAttributes.livemode === true,
          resourceId: resource.id || '',
          referenceNo: deposit.referenceNo,
          processedAt: receivedAt,
          result: 'already_paid',
        });
        return { duplicate: false, ignored: true };
      }
      balanceDelta = depositAmount;
      walletBalanceAfter = Number((walletBalance + balanceDelta).toFixed(2));
      nextStatus = 'paid';
      notificationType = 'success';
      notificationTitle = 'Wallet Deposit Complete';
      notificationMessage = `Your PHP ${depositAmount.toFixed(2)} deposit (${deposit.referenceNo}) has been added to your wallet.`;
      Object.assign(depositUpdate, {
        status: nextStatus,
        paidAt: receivedAt,
        walletBalanceAfter,
        paymongoPaymentId: paymentId || resourceAttributes.payment_intent_id || deposit.paymongoPaymentId || '',
        paymentPaidEventId: eventId,
      });
      walletTransaction = {
        ref: userRef.collection('walletTransactions').doc(`deposit-${deposit.depositId || deposit.requestId}`),
        data: {
          type: 'wallet_deposit',
          label: 'Wallet Deposit',
          detail: `PayMongo checkout · ${deposit.referenceNo}`,
          referenceNo: deposit.referenceNo,
          amount: depositAmount,
          amountSub: 'Deposit credit',
          currency: 'PHP',
          status: 'completed',
          positive: true,
          createdAt: receivedAt,
        },
      };
    } else if (eventType === 'payment.failed') {
      if (['paid', 'partially_refunded', 'refunded'].includes(deposit.status)) {
        transaction.create(eventRef, {
          eventId,
          eventType,
          livemode: eventAttributes.livemode === true,
          resourceId: resource.id || '',
          referenceNo: deposit.referenceNo,
          processedAt: receivedAt,
          result: 'failure_after_paid',
        });
        return { duplicate: false, ignored: true };
      }
      nextStatus = 'failed';
      notificationType = 'error';
      notificationTitle = 'Wallet Deposit Failed';
      notificationMessage = `Your PHP ${depositAmount.toFixed(2)} deposit (${deposit.referenceNo}) was not completed. You can try again.`;
      Object.assign(depositUpdate, { status: nextStatus, failedAt: receivedAt, paymentFailedEventId: eventId });
    } else {
      if (!['paid', 'partially_refunded'].includes(deposit.status)) {
        transaction.create(eventRef, {
          eventId,
          eventType,
          livemode: eventAttributes.livemode === true,
          resourceId: resource.id || '',
          referenceNo: deposit.referenceNo,
          processedAt: receivedAt,
          result: 'refund_without_wallet_credit',
        });
        return { duplicate: false, ignored: true };
      }
      const refundEntries = Array.isArray(resourceAttributes.refunds) ? resourceAttributes.refunds : [];
      const refundTotalFromEntries = refundEntries
        .filter((refund) => refund?.attributes?.status === 'succeeded' || refund?.status === 'succeeded')
        .reduce((total, refund) => total + Number(refund?.attributes?.amount ?? refund?.amount ?? 0), 0);
      const cumulativeRefundInCentavos = Math.min(
        expectedAmountInCentavos,
        refundTotalFromEntries > 0
          ? refundTotalFromEntries
          : Number(resourceAttributes.refunded_amount ?? resourceAttributes.amount ?? expectedAmountInCentavos),
      );
      const alreadyRefundedInCentavos = Number(deposit.refundedAmountInCentavos || 0);
      const refundDeltaInCentavos = Math.max(0, cumulativeRefundInCentavos - alreadyRefundedInCentavos);
      if (refundDeltaInCentavos === 0) {
        transaction.create(eventRef, {
          eventId,
          eventType,
          livemode: eventAttributes.livemode === true,
          resourceId: resource.id || '',
          referenceNo: deposit.referenceNo,
          processedAt: receivedAt,
          result: 'refund_already_applied',
        });
        return { duplicate: false, ignored: true };
      }

      balanceDelta = -Number((refundDeltaInCentavos / 100).toFixed(2));
      walletBalanceAfter = Number((walletBalance + balanceDelta).toFixed(2));
      const fullyRefunded = cumulativeRefundInCentavos >= expectedAmountInCentavos;
      nextStatus = fullyRefunded ? 'refunded' : 'partially_refunded';
      notificationType = 'warning';
      notificationTitle = fullyRefunded ? 'Wallet Deposit Refunded' : 'Wallet Deposit Partially Refunded';
      notificationMessage = `PHP ${(refundDeltaInCentavos / 100).toFixed(2)} from deposit ${deposit.referenceNo} was refunded and removed from your wallet.`;
      Object.assign(depositUpdate, {
        status: nextStatus,
        refundedAt: receivedAt,
        refundedAmountInCentavos: cumulativeRefundInCentavos,
        walletBalanceAfterRefund: walletBalanceAfter,
        refundEventId: eventId,
      });
      walletTransaction = {
        ref: userRef.collection('walletTransactions').doc(`deposit-refund-${eventId}`),
        data: {
          type: 'wallet_deposit_refund',
          label: fullyRefunded ? 'Wallet Deposit Refund' : 'Partial Deposit Refund',
          detail: `PayMongo refund · ${deposit.referenceNo}`,
          referenceNo: deposit.referenceNo,
          amount: Number((refundDeltaInCentavos / 100).toFixed(2)),
          amountSub: 'Wallet refund',
          currency: 'PHP',
          status: 'completed',
          positive: false,
          createdAt: receivedAt,
        },
      };
    }

    transaction.update(userRef, {
      ...(balanceDelta !== 0 ? { walletBalance: walletBalanceAfter } : {}),
      hasNotifications: true,
      updatedAt: receivedAt,
    });
    transaction.set(depositRef, depositUpdate, { merge: true });
    if (isLegacyDeposit && deposit.requestId) {
      transaction.set(userRef.collection('depositRequests').doc(deposit.requestId), depositUpdate, { merge: true });
    }
    transaction.set(notificationRef, {
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      referenceNo: deposit.referenceNo,
      amount: Math.abs(balanceDelta) || depositAmount,
      currency: 'PHP',
      read: false,
      createdAt: receivedAt,
      updatedAt: receivedAt,
    }, { merge: true });
    if (walletTransaction) {
      transaction.set(walletTransaction.ref, walletTransaction.data, { merge: true });
    }
    transaction.create(eventRef, {
      eventId,
      eventType,
      livemode: eventAttributes.livemode === true,
      resourceId: resource.id || '',
      referenceNo: deposit.referenceNo,
      processedAt: receivedAt,
      result: nextStatus,
    });

    return {
      duplicate: false,
      userId: deposit.userId,
      referenceNo: deposit.referenceNo,
      amount: Math.abs(balanceDelta) || depositAmount,
      walletBalanceAfter,
      notificationTitle,
      notificationMessage,
      notificationType,
    };
  });

  if (!result.duplicate && !result.ignored && result.userId) {
    await sendUserPushNotification(db().collection('users').doc(result.userId), {
      title: result.notificationTitle,
      body: result.notificationMessage,
      data: {
        type: 'wallet_deposit_update',
        referenceNo: result.referenceNo,
        amount: result.amount,
        walletBalance: result.walletBalanceAfter,
        status: result.notificationType,
      },
    });
  }

  response.status(200).json({
    received: true,
    duplicate: result.duplicate,
    ignored: result.ignored === true,
    status: result.ignored ? 'ignored' : result.notificationType || 'recorded',
  });
});

exports.exchangeGemsToWallet = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const gemAmount = Number(request.data?.gemAmount);
  const expectedGemValue = Number(request.data?.expectedGemValue);
  const requestId = typeof request.data?.requestId === 'string'
    ? request.data.requestId.trim()
    : '';
  if (!Number.isFinite(gemAmount) || gemAmount <= 0 || Math.abs(gemAmount - Number(gemAmount.toFixed(4))) > 1e-8) {
    throw new HttpsError('invalid-argument', 'Enter a GEM amount greater than zero with up to four decimal places.');
  }
  if (!Number.isFinite(expectedGemValue) || expectedGemValue <= 0) {
    throw new HttpsError('invalid-argument', 'A valid GEM value quote is required.');
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid exchange request ID is required.');
  }

  const userRef = db().collection('users').doc(request.auth.uid);
  const exchangeRef = userRef.collection('exchangeTransactions').doc(requestId);
  const gemTransactionRef = userRef.collection('gemTransactions').doc(`exchange-${requestId}`);
  const notificationRef = userRef.collection('notifications').doc(`exchange-${requestId}`);
  const gemTransactionsQuery = db().collectionGroup('gemTransactions');
  const gemValuePumpsQuery = db().collection('gemValuePumps');
  const settingsRef = db().collection('settings').doc('admin');

  const exchangeResult = await db().runTransaction(async (transaction) => {
    const [userSnapshot, exchangeSnapshot, transactionsSnapshot, pumpsSnapshot, settingsSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(exchangeRef),
      transaction.get(gemTransactionsQuery),
      transaction.get(gemValuePumpsQuery),
      transaction.get(settingsRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Your user account could not be found.');
    }

    if (exchangeSnapshot.exists) {
      const existingExchange = exchangeSnapshot.data() || {};
      return {
        success: true,
        duplicate: true,
        exchangeId: exchangeSnapshot.id,
        gemAmount: Number(existingExchange.gemAmount || 0),
        walletAmount: Number(existingExchange.walletAmount || 0),
        gemValue: Number(existingExchange.gemValue || 0),
        currency: existingExchange.currency || 'PHP',
        availableGems: Number(existingExchange.gemBalanceAfter || 0),
        walletBalance: Number(existingExchange.walletBalanceAfter || 0),
      };
    }

    let totalAccumulatedGems = 0;
    let totalGemBurn = 0;
    const totalGemPump = pumpsSnapshot.docs.reduce((total, document) => {
      const amount = Number(document.data()?.amount || 0);
      return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0);
    transactionsSnapshot.docs.forEach((document) => {
      const data = document.data() || {};
      const amount = Number(data.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (data.type === 'gem_burn') {
        totalGemBurn += amount;
      } else if (GEM_VALUE_EARNING_TYPES.includes(data.type)) {
        totalAccumulatedGems += amount;
      }
    });
    const currentGemValue = getGemValueSnapshot(
      totalAccumulatedGems,
      totalGemBurn,
      totalGemPump,
    ).value;
    if (Number(expectedGemValue.toFixed(4)) !== currentGemValue) {
      throw new HttpsError('failed-precondition', 'The GEM value changed. Review the updated quote before confirming.');
    }
    if (currentGemValue <= 0) {
      throw new HttpsError('failed-precondition', 'GEM exchanges are unavailable because the current GEM value is zero.');
    }

    const userData = userSnapshot.data() || {};
    const currentGemBalance = Number(
      userData.gemPoints ?? userData.gemsBalance ?? userData.gemBalance ?? userData.gems ?? 0,
    );
    const currentWalletBalance = Number(userData.walletBalance ?? userData.balance ?? 0);
    if (!Number.isFinite(currentGemBalance) || currentGemBalance < gemAmount) {
      throw new HttpsError('failed-precondition', 'Your available GEM balance has changed. Update the amount and try again.');
    }
    if (!Number.isFinite(currentWalletBalance) || currentWalletBalance < 0) {
      throw new HttpsError('failed-precondition', 'Your wallet balance is invalid. Contact support.');
    }

    const currency = settingsSnapshot.data()?.currency || 'PHP';
    const walletAmount = Number((gemAmount * currentGemValue).toFixed(2));
    const gemBalanceAfter = Number((currentGemBalance - gemAmount).toFixed(4));
    const walletBalanceAfter = Number((currentWalletBalance + walletAmount).toFixed(2));
    const createdAt = new Date().toISOString();

    transaction.update(userRef, {
      gemPoints: gemBalanceAfter,
      walletBalance: walletBalanceAfter,
      hasNotifications: true,
      updatedAt: createdAt,
    });
    transaction.set(exchangeRef, {
      type: 'gem_to_wallet_exchange',
      status: 'completed',
      gemAmount,
      walletAmount,
      gemValue: currentGemValue,
      currency,
      gemBalanceAfter,
      walletBalanceAfter,
      requestId,
      createdAt,
    });
    transaction.set(gemTransactionRef, {
      type: 'gem_to_wallet_exchange',
      amount: gemAmount,
      walletAmount,
      gemValue: currentGemValue,
      currency,
      direction: 'debit',
      requestId,
      createdAt,
    });
    transaction.set(notificationRef, {
      type: 'success',
      title: 'GEM Exchange Complete',
      message: `You exchanged ${gemAmount} GEM${gemAmount === 1 ? '' : 's'} for ${currency} ${walletAmount.toFixed(2)}.`,
      amount: walletAmount,
      gemAmount,
      currency,
      read: false,
      createdAt,
      updatedAt: createdAt,
    });

    return {
      success: true,
      duplicate: false,
      exchangeId: requestId,
      gemAmount,
      walletAmount,
      gemValue: currentGemValue,
      currency,
      availableGems: gemBalanceAfter,
      walletBalance: walletBalanceAfter,
    };
  });

  if (!exchangeResult.duplicate) {
    await sendUserPushNotification(userRef, {
      title: 'GEM Exchange Complete',
      body: `You exchanged ${exchangeResult.gemAmount} GEM${exchangeResult.gemAmount === 1 ? '' : 's'} for ${exchangeResult.currency} ${exchangeResult.walletAmount.toFixed(2)}.`,
      data: {
        type: 'gem_to_wallet_exchange',
        exchangeId: exchangeResult.exchangeId,
        gemAmount: exchangeResult.gemAmount,
        walletAmount: exchangeResult.walletAmount,
      },
    });
  }

  return exchangeResult;
});

exports.submitWithdrawalRequest = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = request.auth.uid;
  const data = request.data || {};
  const requestId = typeof data.requestId === 'string' ? data.requestId.trim() : '';
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid withdrawal request ID is required.');
  }

  const method = data.method;
  if (!['ewallet', 'bank'].includes(method)) {
    throw new HttpsError('invalid-argument', 'Choose a supported withdrawal method.');
  }
  const provider = requireNonEmptyString(data.provider, 'Payout provider');
  const supportedProviders = method === 'ewallet'
    ? WITHDRAWAL_EWALLET_PROVIDERS
    : WITHDRAWAL_BANK_PROVIDERS;
  if (!supportedProviders.includes(provider)) {
    throw new HttpsError('invalid-argument', 'Choose a supported payout provider.');
  }

  const accountName = requireNonEmptyString(data.accountName, 'Account name');
  const enteredDestination = requireNonEmptyString(data.details, 'Payout account');
  if (accountName.length > 120 || enteredDestination.length > 120) {
    throw new HttpsError('invalid-argument', 'Payout details are too long.');
  }
  const destination = method === 'ewallet'
    ? enteredDestination.replace(/[()\s-]/g, '')
    : enteredDestination;
  if (method === 'ewallet' && !/^(?:09\d{9}|\+639\d{9})$/.test(destination)) {
    throw new HttpsError('invalid-argument', 'Enter a valid Philippine mobile number.');
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount)
    || amount < WITHDRAWAL_MINIMUM
    || amount > WITHDRAWAL_MAXIMUM
    || Math.abs(amount - Number(amount.toFixed(2))) > 1e-8) {
    throw new HttpsError('invalid-argument', 'Withdrawal amount must be between PHP 200.00 and PHP 50,000.00.');
  }
  const serviceFee = Number((amount * WITHDRAWAL_FEE_RATE).toFixed(2));
  const totalDeduction = Number((amount + serviceFee).toFixed(2));

  const qrCodePath = requireNonEmptyString(data.qrCodePath, 'Payout QR code');
  if (qrCodePath !== `withdrawal-qr-codes/${uid}/payout-qr`) {
    throw new HttpsError('invalid-argument', 'Upload your payout QR code again before submitting.');
  }
  const qrCodeUrl = requireNonEmptyString(data.qrCodeUrl, 'Payout QR code URL');
  let parsedQrCodeUrl;
  try {
    parsedQrCodeUrl = new URL(qrCodeUrl);
  } catch {
    throw new HttpsError('invalid-argument', 'A valid payout QR code URL is required.');
  }
  const expectedQrObjectPath = `/o/${encodeURIComponent(qrCodePath)}`;
  if (parsedQrCodeUrl.hostname !== 'firebasestorage.googleapis.com'
    || !parsedQrCodeUrl.pathname.endsWith(expectedQrObjectPath)) {
    throw new HttpsError('invalid-argument', 'A valid payout QR code URL is required.');
  }
  const qrCodeName = typeof data.qrCodeName === 'string'
    ? data.qrCodeName.trim().slice(0, 160)
    : 'Payout QR code';

  const userRef = db().collection('users').doc(uid);
  const withdrawalRef = db().collection('withdrawalRequests').doc(requestId);
  const userWithdrawalRef = userRef.collection('withdrawalRequests').doc(requestId);
  const notificationRef = userRef.collection('notifications').doc(`withdrawal-${requestId}`);
  const createdAt = new Date().toISOString();
  const referenceNo = `WD-${manilaDateKey(new Date()).replace(/-/g, '')}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  const result = await db().runTransaction(async (transaction) => {
    const [userSnapshot, existingRequestSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(withdrawalRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Your user account could not be found.');
    }

    if (existingRequestSnapshot.exists) {
      const existingRequest = existingRequestSnapshot.data() || {};
      if (existingRequest.userId !== uid) {
        throw new HttpsError('already-exists', 'This withdrawal request ID is already in use.');
      }
      return {
        success: true,
        duplicate: true,
        requestId,
        referenceNo: existingRequest.referenceNo,
        status: existingRequest.status,
        amount: Number(existingRequest.amount || 0),
        serviceFee: Number(existingRequest.serviceFee || 0),
        totalDeduction: Number(existingRequest.totalDeduction || 0),
      };
    }

    const userData = userSnapshot.data() || {};
    const walletBalance = Number(userData.walletBalance ?? userData.balance ?? 0);
    if (!Number.isFinite(walletBalance) || walletBalance < totalDeduction) {
      throw new HttpsError('failed-precondition', 'Your wallet balance does not cover the withdrawal amount and service fee.');
    }
    const walletBalanceAfterRequest = Number((walletBalance - totalDeduction).toFixed(2));

    const record = {
      requestId,
      referenceNo,
      userId: uid,
      userName: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' '),
      userEmail: userData.email || request.auth.token.email || '',
      method,
      provider,
      accountName,
      details: destination,
      amount,
      serviceFee,
      totalDeduction,
      walletDeducted: true,
      walletRefunded: false,
      walletBalanceAfterRequest,
      currency: 'PHP',
      qrCode: { name: qrCodeName, path: qrCodePath, url: qrCodeUrl },
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    };
    const notification = {
      type: 'pending',
      title: 'Withdrawal Request Submitted',
      message: `Withdrawal ${referenceNo} is awaiting admin approval. PHP ${totalDeduction.toFixed(2)} has been deducted and will be refunded if the request is rejected. Please allow 1-3 business days for review.`,
      referenceNo,
      requestId,
      amount,
      read: false,
      createdAt,
      updatedAt: createdAt,
    };

    transaction.set(withdrawalRef, record);
    transaction.set(userWithdrawalRef, record);
    transaction.set(notificationRef, notification);
    transaction.update(userRef, {
      walletBalance: walletBalanceAfterRequest,
      hasNotifications: true,
      updatedAt: createdAt,
    });

    return {
      success: true,
      duplicate: false,
      requestId,
      referenceNo,
      status: record.status,
      amount,
      serviceFee,
      totalDeduction,
      walletBalanceAfterRequest,
    };
  });

  let pushStatus = null;
  if (!result.duplicate) {
    pushStatus = await sendUserPushNotification(userRef, {
      title: 'Withdrawal Request Submitted',
      body: `Request ${result.referenceNo} is awaiting admin approval. Please allow 1-3 business days for review.`,
      data: {
        type: 'withdrawal_request',
        requestId: result.requestId,
        referenceNo: result.referenceNo,
      },
    });
  }

  return {
    ...result,
    ...(pushStatus ? {
      pushTokensRegistered: pushStatus.tokenCount > 0,
      pushNotificationSent: pushStatus.successCount > 0,
      pushDeliveryFailed: pushStatus.deliveryFailed || pushStatus.failedCount > 0,
    } : {}),
  };
});

exports.getWithdrawalRequests = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const snapshot = await db().collection('withdrawalRequests').get();
  const requests = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
    .slice(0, 100);
  return { requests };
});

exports.reviewWithdrawalRequest = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  await assertIsAdmin(request.auth.uid);

  const requestId = typeof request.data?.requestId === 'string'
    ? request.data.requestId.trim()
    : '';
  const decision = request.data?.decision;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId) || !['approved', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'A valid withdrawal request and decision are required.');
  }

  const withdrawalRef = db().collection('withdrawalRequests').doc(requestId);
  const reviewedAt = new Date().toISOString();
  const result = await db().runTransaction(async (transaction) => {
    const withdrawalSnapshot = await transaction.get(withdrawalRef);
    if (!withdrawalSnapshot.exists) {
      throw new HttpsError('not-found', 'The withdrawal request could not be found.');
    }

    const withdrawal = withdrawalSnapshot.data() || {};
    if (withdrawal.status !== 'pending') {
      return {
        success: true,
        duplicate: true,
        status: withdrawal.status,
        referenceNo: withdrawal.referenceNo,
      };
    }

    const userRef = db().collection('users').doc(withdrawal.userId);
    const userWithdrawalRef = userRef.collection('withdrawalRequests').doc(requestId);
    const notificationRef = userRef.collection('notifications').doc(`withdrawal-${requestId}`);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'The requester account could not be found.');
    }

    const userData = userSnapshot.data() || {};
    const currentWalletBalance = Number(userData.walletBalance ?? userData.balance ?? 0);
    const totalDeduction = Number(withdrawal.totalDeduction);
    if (!Number.isFinite(currentWalletBalance) || currentWalletBalance < 0) {
      throw new HttpsError('failed-precondition', 'The requester wallet balance is invalid.');
    }
    let walletBalanceAfter = currentWalletBalance;
    let walletChanged = false;
    let walletRefunded = withdrawal.walletRefunded === true;

    if (decision === 'approved' && withdrawal.walletDeducted !== true) {
      if (!Number.isFinite(totalDeduction) || totalDeduction <= 0 || currentWalletBalance < totalDeduction) {
        throw new HttpsError('failed-precondition', 'The requester does not have enough wallet balance to approve this withdrawal.');
      }
      walletBalanceAfter = Number((currentWalletBalance - totalDeduction).toFixed(2));
      walletChanged = true;
    } else if (decision === 'rejected'
      && withdrawal.walletDeducted === true
      && !walletRefunded) {
      if (!Number.isFinite(totalDeduction) || totalDeduction <= 0) {
        throw new HttpsError('failed-precondition', 'The withdrawal deduction is invalid and cannot be refunded automatically.');
      }
      walletBalanceAfter = Number((currentWalletBalance + totalDeduction).toFixed(2));
      walletChanged = true;
      walletRefunded = true;
    }

    transaction.update(userRef, {
      ...(walletChanged ? { walletBalance: walletBalanceAfter } : {}),
      hasNotifications: true,
      updatedAt: reviewedAt,
    });

    const updatedRequest = {
      status: decision,
      reviewedAt,
      reviewedBy: request.auth.uid,
      updatedAt: reviewedAt,
      walletBalanceAfterReview: walletBalanceAfter,
      walletRefunded,
    };
    const approved = decision === 'approved';
    const notification = {
      type: approved ? 'success' : 'error',
      title: approved ? 'Withdrawal Request Approved' : 'Withdrawal Request Not Approved',
      message: approved
        ? `Withdrawal ${withdrawal.referenceNo} was approved. The ${withdrawal.currency} ${Number(withdrawal.totalDeduction).toFixed(2)} wallet deduction remains applied.`
        : walletRefunded
          ? `Withdrawal ${withdrawal.referenceNo} was not approved. ${withdrawal.currency} ${Number(withdrawal.totalDeduction).toFixed(2)} was refunded to your wallet.`
          : `Withdrawal ${withdrawal.referenceNo} was not approved. No wallet deduction was made.`,
      status: decision,
      read: false,
      updatedAt: reviewedAt,
    };

    transaction.update(withdrawalRef, updatedRequest);
    transaction.set(userWithdrawalRef, updatedRequest, { merge: true });
    transaction.set(notificationRef, notification, { merge: true });

    return {
      success: true,
      duplicate: false,
      status: decision,
      referenceNo: withdrawal.referenceNo,
      totalDeduction: Number.isFinite(totalDeduction) ? totalDeduction : 0,
      walletBalanceAfter,
      walletRefunded,
      userId: withdrawal.userId,
      notificationTitle: notification.title,
      notificationMessage: notification.message,
    };
  });

  let pushStatus = null;
  if (!result.duplicate) {
    pushStatus = await sendUserPushNotification(db().collection('users').doc(result.userId), {
      title: result.notificationTitle,
      body: result.notificationMessage,
      data: {
        type: 'withdrawal_request_review',
        requestId,
        referenceNo: result.referenceNo,
        status: result.status,
      },
    });
  }

  return {
    ...result,
    ...(pushStatus ? {
      pushTokensRegistered: pushStatus.tokenCount > 0,
      pushNotificationSent: pushStatus.successCount > 0,
      pushDeliveryFailed: pushStatus.deliveryFailed || pushStatus.failedCount > 0,
    } : {}),
  };
});

exports.creditDailyGemRewards = onSchedule({
  schedule: '0 0 * * *',
  timeZone: 'Asia/Manila',
  region: 'asia-southeast1',
}, async () => {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowKey = manilaDateKey(now);
  const [usersSnapshot, purchasesSnapshot] = await Promise.all([
    db().collection('users').get(),
    db().collection('purchases').get(),
  ]);
  const usersById = new Map(usersSnapshot.docs.map((document) => [document.id, document]));
  const usersByReferralCode = new Map();
  usersSnapshot.docs.forEach((document) => {
    const data = document.data() || {};
    if (data.referralCode) {
      usersByReferralCode.set(data.referralCode, document);
    }
  });

  let credited = 0;
  let expired = 0;

  for (const purchaseDocument of purchasesSnapshot.docs) {
    const purchaseData = purchaseDocument.data() || {};
    if (String(purchaseData.status || '').toLowerCase() !== 'completed') continue;

    const userId = purchaseData.userId || purchaseData.uid;
    const userDocument = usersById.get(userId);
    if (!userDocument) continue;

    const userRef = userDocument.ref;
    const userData = userDocument.data() || {};
    const dailyGemReward = Number(purchaseData.dailyGemReward ?? purchaseData.purchaserReward ?? 0);
    const dailyDistributionReward = Number.isFinite(Number(purchaseData.distributionReward))
      ? Number(purchaseData.distributionReward)
      : DAILY_DISTRIBUTION_REWARDS[String(purchaseData.tier || '').toUpperCase()] || 0;
    const membershipStartDate = asDate(
      purchaseData.membershipStartedAt || purchaseData.completedAt || purchaseData.createdAt || purchaseData.date,
    );
    const membershipExpiresAt = asDate(purchaseData.membershipExpiresAt)
      || (membershipStartDate
        ? new Date(membershipStartDate.getTime() + (45 * 24 * 60 * 60 * 1000))
        : null);
    const membershipDayNumber = getMembershipDayNumber(membershipStartDate, now);
    const purchaseId = purchaseDocument.id;

    if (dailyGemReward <= 0 || !membershipExpiresAt) continue;

    if (membershipExpiresAt.getTime() <= now.getTime()) {
      if (purchaseId === userData.membershipPurchaseId) {
        await userRef.update({ membershipStatus: 'expired', updatedAt: nowIso });
        expired += 1;
      }
      continue;
    }

    if (!membershipDayNumber || membershipDayNumber < 2 || membershipDayNumber > 45) continue;

    const rewardRef = userRef.collection('gemTransactions').doc(`daily-${purchaseId}-${nowKey}`);
    const notificationRef = userRef.collection('notifications').doc(`daily-${purchaseId}-${nowKey}`);
    let earned = false;
    let earnedToSafetyNet = false;
    const sourceDayNumber = membershipDayNumber;
    const sourceMembershipPurchaseId = purchaseId;

    await db().runTransaction(async (transaction) => {
      const [currentUserSnapshot, rewardSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(rewardRef),
      ]);
      if (!currentUserSnapshot.exists || rewardSnapshot.exists) return;

      const currentUser = currentUserSnapshot.data() || {};
      const currentGemPoints = Number(currentUser.gemPoints || 0);

      earnedToSafetyNet = sourceDayNumber % 5 === 0;
      transaction.update(userRef, {
        ...(earnedToSafetyNet
          ? {}
          : { gemPoints: (Number.isFinite(currentGemPoints) ? currentGemPoints : 0) + dailyGemReward }),
        nextGemRewardAt: nextManilaRewardAt(now),
        hasNotifications: true,
        updatedAt: nowIso,
      });
      transaction.set(rewardRef, {
        type: earnedToSafetyNet ? 'gem_burn' : 'daily_membership_reward',
        amount: dailyGemReward,
        earningNumber: sourceDayNumber,
        dayNumber: sourceDayNumber,
        ...(earnedToSafetyNet ? { reason: 'Earnings Company Safety Net' } : {}),
        ...(sourceMembershipPurchaseId ? { purchaseId: sourceMembershipPurchaseId } : {}),
        tier: purchaseData.tier || '',
        createdAt: nowIso,
      });
      transaction.set(notificationRef, {
        type: earnedToSafetyNet ? 'gem_burn' : 'daily_membership_reward',
        title: earnedToSafetyNet
          ? 'Earnings Company Safety Net'
          : '🎉 Congratulations! You’ve Earned Cashback!',
        message: earnedToSafetyNet
          ? `Day ${sourceDayNumber}: ${dailyGemReward} GEM${dailyGemReward === 1 ? '' : 's'} from your membership cashback was added to the company safety net.`
          : 'Your cashback has been successfully added to your GEM Points.',
        amount: dailyGemReward,
        dayNumber: sourceDayNumber,
        ...(earnedToSafetyNet ? { reason: 'Earnings Company Safety Net' } : {}),
        ...(sourceMembershipPurchaseId ? { purchaseId: sourceMembershipPurchaseId } : {}),
        tier: purchaseData.tier || '',
        read: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      earned = true;
    });

    if (earned) credited += 1;
    if (dailyDistributionReward <= 0) continue;

    const hierarchyRecipients = [];
    const selectedRecipientIds = new Set();
    let nextUplineCode = userData.uplineReferralCode || '';
    let firstLeaderFound = false;
    let firstCeoFound = false;
    const visitedReferralCodes = new Set();

    while (nextUplineCode && !visitedReferralCodes.has(nextUplineCode)) {
      visitedReferralCodes.add(nextUplineCode);
      const ancestorDocument = usersByReferralCode.get(nextUplineCode);
      if (!ancestorDocument) break;

      const ancestorData = ancestorDocument.data() || {};
      const ancestorRole = String(ancestorData.role || '').toLowerCase();
      if (hierarchyRecipients.length === 0) {
        hierarchyRecipients.push({
          userRef: ancestorDocument.ref,
          userId: ancestorDocument.id,
          role: 'upline',
          document: ancestorDocument,
        });
        selectedRecipientIds.add(ancestorDocument.id);
      } else if (ancestorRole === 'leader' && !firstLeaderFound && !selectedRecipientIds.has(ancestorDocument.id)) {
        hierarchyRecipients.push({
          userRef: ancestorDocument.ref,
          userId: ancestorDocument.id,
          role: 'leader',
          document: ancestorDocument,
        });
        selectedRecipientIds.add(ancestorDocument.id);
        firstLeaderFound = true;
      } else if (ancestorRole === 'ceo' && !firstCeoFound && !selectedRecipientIds.has(ancestorDocument.id)) {
        hierarchyRecipients.push({
          userRef: ancestorDocument.ref,
          userId: ancestorDocument.id,
          role: 'ceo',
          document: ancestorDocument,
        });
        selectedRecipientIds.add(ancestorDocument.id);
        firstCeoFound = true;
      }

      nextUplineCode = ancestorData.uplineReferralCode || '';
    }

    for (const recipient of hierarchyRecipients) {
      try {
        const recipientRef = recipient.userRef;
        const recipientRewardRef = recipientRef.collection('gemTransactions')
          .doc(`daily-hierarchy-${purchaseId}-${nowKey}-${userDocument.id}-${recipient.role}`);
        const recipientNotificationRef = recipientRef.collection('notifications')
          .doc(`daily-hierarchy-${purchaseId}-${nowKey}-${userDocument.id}-${recipient.role}`);

        await db().runTransaction(async (transaction) => {
          const [recipientSnapshot, recipientRewardSnapshot] = await Promise.all([
            transaction.get(recipientRef),
            transaction.get(recipientRewardRef),
          ]);
          if (!recipientSnapshot.exists || recipientRewardSnapshot.exists) return;

          const latestRecipient = recipientSnapshot.data() || {};
          const latestGemPoints = Number(latestRecipient.gemPoints || 0);
          const payloadType = 'daily_hierarchy_distribution_reward';
          const isSafetyNetEarning = sourceDayNumber % 5 === 0;

          transaction.update(recipientRef, {
            ...(isSafetyNetEarning
              ? {}
              : { gemPoints: (Number.isFinite(latestGemPoints) ? latestGemPoints : 0) + dailyDistributionReward }),
            hasNotifications: true,
            updatedAt: nowIso,
          });
          transaction.set(recipientRewardRef, {
            type: isSafetyNetEarning ? 'gem_burn' : payloadType,
            amount: dailyDistributionReward,
            earningNumber: sourceDayNumber,
            dayNumber: sourceDayNumber,
            ...(isSafetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
            ...(sourceMembershipPurchaseId ? { purchaseId: sourceMembershipPurchaseId } : {}),
            role: recipient.role,
            sourceUserId: userDocument.id,
            tier: latestRecipient.membershipTier || latestRecipient.role || '',
            createdAt: nowIso,
          });
          transaction.set(recipientNotificationRef, {
            type: isSafetyNetEarning ? 'gem_burn' : payloadType,
            title: isSafetyNetEarning ? 'Earnings Company Safety Net' : 'GEM Cashback',
            message: isSafetyNetEarning
              ? `Day ${sourceDayNumber}: ${dailyDistributionReward} GEM${dailyDistributionReward === 1 ? '' : 's'} from ${userData.name || userData.username || userDocument.id}'s membership cashback was added to the company safety net.`
              : `Day ${sourceDayNumber}: You earned ${dailyDistributionReward} GEM${dailyDistributionReward === 1 ? '' : 's'} from ${userData.name || userData.username || userDocument.id}'s ${String(purchaseData.tier || 'membership').toUpperCase()} membership.`,
            amount: dailyDistributionReward,
            dayNumber: sourceDayNumber,
            ...(isSafetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
            ...(sourceMembershipPurchaseId ? { purchaseId: sourceMembershipPurchaseId } : {}),
            read: false,
            role: recipient.role,
            sourceUserId: userDocument.id,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        });

      } catch (error) {
        console.error('Failed to distribute daily hierarchy reward:', error);
      }
    }
  }

  console.log(`Daily GEM cashback credited: ${credited}; memberships expired: ${expired}`);
});

exports.getUserNotifications = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const notificationsSnapshot = await db()
    .collection('users')
    .doc(request.auth.uid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const notifications = notificationsSnapshot.docs.map((document) => {
    const data = document.data() || {};
    const isDailyMembershipReward = data.type === 'daily_membership_reward';
    return {
      id: document.id,
      title: isDailyMembershipReward
        ? '🎉 Congratulations! You’ve Earned Cashback!'
        : data.title || 'Gemstone Notification',
      message: isDailyMembershipReward
        ? 'Your cashback has been successfully added to your GEM Points.'
        : data.message || '',
      time: data.createdAt || data.updatedAt || '',
      unread: data.read === false,
      type: data.type || 'info',
    };
  });

  return { notifications };
});

exports.getUserMessages = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const messagesSnapshot = await db()
    .collection('users')
    .doc(request.auth.uid)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const messageIdToMarkRead = request.data?.markReadMessageId;
  if (messageIdToMarkRead !== undefined
    && (typeof messageIdToMarkRead !== 'string'
      || !/^[A-Za-z0-9_-]{1,150}$/.test(messageIdToMarkRead))) {
    throw new HttpsError('invalid-argument', 'A valid message ID is required.');
  }
  const selectedMessage = messageIdToMarkRead
    ? messagesSnapshot.docs.find((document) => document.id === messageIdToMarkRead)
    : null;
  const selectedMessageData = selectedMessage?.data() || {};
  const isSellerApplicationMessage = (type) => [
    'seller_application_message',
    'seller_application_rejection',
    'seller_application_approval',
  ].includes(type);
  const shouldMarkSelectedMessageRead = isSellerApplicationMessage(selectedMessageData.type)
    && selectedMessageData.read === false;
  if (shouldMarkSelectedMessageRead) {
    await selectedMessage.ref.update({ read: true });
  }
  const unreadMarketplaceMessages = messagesSnapshot.docs.filter((document) => {
    const data = document.data() || {};
    return isSellerApplicationMessage(data.type)
      && data.read === false
      && document.id !== (shouldMarkSelectedMessageRead ? messageIdToMarkRead : null);
  });

  const messages = messagesSnapshot.docs.map((document) => {
    const data = document.data() || {};
    return {
      id: document.id,
      applicationId: data.applicationId || '',
      title: data.title || 'Gemstone Message',
      message: data.message || '',
      time: data.createdAt || data.updatedAt || '',
      unread: data.read === false
        && !(shouldMarkSelectedMessageRead && document.id === messageIdToMarkRead),
      type: data.type || 'info',
    };
  });

  return {
    messages,
    unreadCount: unreadMarketplaceMessages.length,
  };
});

exports.deleteUserMarketplaceMessage = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to delete Marketplace messages.');
  }

  const messageId = request.data?.messageId;
  if (typeof messageId !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(messageId)) {
    throw new HttpsError('invalid-argument', 'A valid message ID is required.');
  }

  const messageRef = db()
    .collection('users')
    .doc(request.auth.uid)
    .collection('messages')
    .doc(messageId);
  const messageSnapshot = await messageRef.get();
  if (!messageSnapshot.exists) {
    throw new HttpsError('not-found', 'This Marketplace message no longer exists.');
  }

  const allowedTypes = [
    'seller_application_message',
    'seller_application_rejection',
    'seller_application_approval',
  ];
  if (!allowedTypes.includes(messageSnapshot.data()?.type)) {
    throw new HttpsError('permission-denied', 'This message cannot be deleted here.');
  }

  await messageRef.delete();
  return { deleted: true };
});

exports.deleteUserNotifications = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const notificationsRef = db()
    .collection('users')
    .doc(request.auth.uid)
    .collection('notifications');
  const deleteAll = request.data?.deleteAll === true;
  const notificationIds = request.data?.notificationIds;
  let notificationRefs = [];

  if (deleteAll) {
    const snapshot = await notificationsRef.get();
    notificationRefs = snapshot.docs.map((document) => document.ref);
  } else {
    if (!Array.isArray(notificationIds)
      || notificationIds.length === 0
      || notificationIds.length > 100
      || !notificationIds.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(id))) {
      throw new HttpsError('invalid-argument', 'Select one or more valid notifications to delete.');
    }
    notificationRefs = [...new Set(notificationIds)].map((id) => notificationsRef.doc(id));
  }

  for (let start = 0; start < notificationRefs.length; start += 500) {
    const batch = db().batch();
    notificationRefs.slice(start, start + 500).forEach((notificationRef) => batch.delete(notificationRef));
    await batch.commit();
  }

  const remainingNotifications = await notificationsRef.limit(1).get();
  await db().collection('users').doc(request.auth.uid).set(
    { hasNotifications: !remainingNotifications.empty },
    { merge: true },
  );

  return { success: true, deletedCount: notificationRefs.length };
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

exports.recordTermsAcceptance = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const termsVersion = typeof request.data?.termsVersion === 'string'
    ? request.data.termsVersion.trim()
    : '';
  if (!termsVersion) {
    throw new HttpsError('invalid-argument', 'Terms version is required.');
  }

  const userRef = db().collection('users').doc(request.auth.uid);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) {
    throw new HttpsError('not-found', 'Your user account could not be found.');
  }

  const acceptedAt = new Date().toISOString();
  await userRef.update({
    termsAccepted: true,
    termsAcceptedAt: acceptedAt,
    termsVersion,
    updatedAt: acceptedAt,
  });

  return { success: true, termsAcceptedAt: acceptedAt, termsVersion };
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
    gemPoints: 0,
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

exports.getUserAuthStatus = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);
  const userId = requireNonEmptyString(request.data?.userId, 'User ID');

  try {
    const userRecord = await getAuth().getUser(userId);
    return { emailVerified: userRecord.emailVerified === true };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'The user authentication account could not be found.');
    }
    throw new HttpsError('internal', 'Failed to load the user verification status.');
  }
});

exports.getAdminPackages = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);
  const snapshot = await db().collection('settings').doc('packages').get();
  return snapshot.exists ? snapshot.data() : { images: {} };
});

exports.getPackageImages = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const snapshot = await db().collection('settings').doc('packages').get();
  return snapshot.exists
    ? {
      images: snapshot.data()?.images || {},
      packageDetails: snapshot.data()?.packageDetails || {},
    }
    : { images: {}, packageDetails: {} };
});

exports.saveAdminPackageImages = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);
  const images = request.data?.images;
  const packageDetails = request.data?.packageDetails;
  if (!images || typeof images !== 'object' || Array.isArray(images)) {
    throw new HttpsError('invalid-argument', 'Package images are required.');
  }

  const normalizedImages = {};
  for (const packageId of ['emerald', 'sapphire', 'diamond']) {
    const packageImages = Array.isArray(images[packageId]) ? images[packageId] : [];
    normalizedImages[packageId] = Array.from({ length: 6 }, (_, index) => (
      typeof packageImages[index] === 'string' ? packageImages[index].trim() : ''
    ));
  }

  const normalizedPackageDetails = {};
  for (const packageId of ['emerald', 'sapphire', 'diamond']) {
    const details = Array.isArray(packageDetails?.[packageId]) ? packageDetails[packageId] : [];
    normalizedPackageDetails[packageId] = Array.from({ length: 6 }, (_, index) => ({
      name: typeof details[index]?.name === 'string' ? details[index].name.trim().slice(0, 120) : '',
      description: typeof details[index]?.description === 'string' ? details[index].description.trim().slice(0, 1000) : '',
    }));
  }

  await db().collection('settings').doc('packages').set(
    {
      images: normalizedImages,
      packageDetails: normalizedPackageDetails,
      updatedAt: new Date().toISOString(),
      updatedBy: request.auth.uid,
    },
    { merge: true },
  );
  return { images: normalizedImages };
});

exports.getAdminDashboard = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const [usersSnapshot, purchasesSnapshot, withdrawalRequestsSnapshot, codesSnapshot, gemValueTransactionsSnapshot, gemValuePumpsSnapshot] = await Promise.all([
    db().collection('users').get(),
    db().collection('purchases').get(),
    db().collection('withdrawalRequests').get(),
    db().collection('purchaseCodes').get(),
    db().collectionGroup('gemTransactions').get(),
    db().collection('gemValuePumps').get(),
  ]);
  const gemBurnTransactions = gemValueTransactionsSnapshot.docs.filter(
    (document) => document.data()?.type === 'gem_burn',
  );

  const getDate = (data) => data.createdAt || data.date || data.updatedAt || null;
  const getAmount = (data) => Number(data.amount ?? data.total ?? data.price ?? 0);
  const getTier = (data) => data.tier || data.packageTier || data.packageName || 'Uncategorized';
  const getName = (data) => data.customerName || data.userName || data.name || data.email || 'Unknown user';
  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const purchases = purchasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const pendingWithdrawals = withdrawalRequestsSnapshot.docs.filter((doc) => {
    const status = String(doc.data()?.status || '').toLowerCase();
    return status === 'pending';
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
    ...pendingWithdrawals.slice(-2).map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        title: 'Withdrawal awaiting review',
        detail: `${data.referenceNo || doc.id} · ${getName(data)} · ₱${Number(data.totalDeduction || 0).toLocaleString('en-PH')}`,
        time: getDate(data),
        tone: 'amber',
      };
    }),
  ];

  const gemPointsTotal = users.reduce((sum, user) => {
    const gemPoints = Number(user.gemPoints ?? user.gemsBalance ?? user.gemBalance ?? user.gems ?? 0);
    return sum + (Number.isFinite(gemPoints) ? gemPoints : 0);
  }, 0);

  const totalAccumulatedGems = gemValueTransactionsSnapshot.docs.reduce((total, document) => {
    const data = document.data() || {};
    return GEM_VALUE_EARNING_TYPES.includes(data.type)
      ? total + Number(data.amount || 0)
      : total;
  }, 0);
  const totalGemBurn = gemBurnTransactions.reduce((total, document) => {
    return total + Number(document.data()?.amount || 0);
  }, 0);
  const totalGemPump = gemValuePumpsSnapshot.docs.reduce((total, document) => {
    const amount = Number(document.data()?.amount || 0);
    return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
  const gemValueSnapshot = getGemValueSnapshot(totalAccumulatedGems, totalGemBurn, totalGemPump);
  const gemPond = gemValueSnapshot.gemPond;
  const burnDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const gemBurnRate = burnDays.map((date) => {
    const dayKey = date.toISOString().slice(0, 10);
    const amount = gemBurnTransactions.reduce((total, document) => {
      const data = document.data() || {};
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
      return createdAt.toISOString().slice(0, 10) === dayKey
        ? total + Number(data.amount || 0)
        : total;
    }, 0);
    return { label: date.toLocaleDateString('en-PH', { weekday: 'short' }), amount };
  });

  return {
    totalSales: purchases.reduce((total, purchase) => total + getAmount(purchase), 0),
    totalCodes: codesSnapshot.size || purchases.reduce(
      (total, purchase) => total + Number(purchase.quantity ?? purchase.count ?? 0),
      0,
    ),
    activeUsers: users.filter((user) => (user.status || 'active') === 'active').length,
    userCount: users.length,
    pendingApprovals: pendingWithdrawals.length,
    purchaseTotalsByTier: Array.from(tierTotals.values()),
    activities: activities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)),
    totalGemValueAccumulated: gemPointsTotal,
    totalGemBurn,
    totalGemPump,
    gemPond,
    gemValue: gemValueSnapshot,
    gemBurnRate,
  };
});

exports.pumpGemValue = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);
  verifyPumpValuePin(request.data?.pin);

  const rawAmount = Number(request.data?.amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0
    || Math.abs(rawAmount - Number(rawAmount.toFixed(2))) > 1e-8) {
    throw new HttpsError('invalid-argument', 'Enter a PHP amount greater than zero with up to two decimal places.');
  }

  const amount = Number(rawAmount.toFixed(2));
  const createdAt = new Date().toISOString();
  const pumpRef = db().collection('gemValuePumps').doc();
  await pumpRef.set({
    amount,
    currency: 'PHP',
    adminId: request.auth.uid,
    createdAt,
  });

  return { success: true, pumpId: pumpRef.id, amount, createdAt };
});

exports.verifyPumpValuePin = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);
  verifyPumpValuePin(request.data?.pin);

  return { verified: true };
});

exports.getGemValuePumpHistory = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  await assertIsAdmin(request.auth.uid);

  const snapshot = await db()
    .collection('gemValuePumps')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data() || {};
    return {
      id: document.id,
      amount: Number(data.amount || 0),
      currency: data.currency || 'PHP',
      createdAt: data.createdAt || null,
    };
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

    const userData = userSnapshot.data() || {};
    const role = userData.role || 'member';
    const authUser = await getAuth().getUser(request.auth.uid);
    if (authUser.customClaims?.role !== role) {
      await getAuth().setCustomUserClaims(request.auth.uid, {
        ...(authUser.customClaims || {}),
        role,
      });
    }
    const referralCode = userData.referralCode || await generateReferralCode();

    if (!userData.referralCode) {
      await db()
        .collection('users')
        .doc(request.auth.uid)
        .set({ referralCode }, { merge: true });
    }

    return {
      mpinSetup: userData.mpinSetup === true,
      role,
      seller: userData.seller === true,
      sellerId: typeof userData.sellerId === 'string' ? userData.sellerId : '',
      username: userData.username || '',
      referralCode,
    };
  } catch (error) {
    if (error.code === 5) {
      return {
        mpinSetup: false,
        role: 'member',
        seller: false,
        sellerId: '',
        username: '',
        referralCode: '',
      };
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
  const authUser = await getAuth().getUser(request.auth.uid);
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
    emailVerified: authUser.emailVerified === true,
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
  const [referralsSnapshot, purchasesSnapshot, codesSnapshot, settingsSnapshot, usersSnapshot, gemTransactionsSnapshot, notificationsSnapshot] = await Promise.all([
    referralCode
      ? db().collection('users').where('uplineReferralCode', '==', referralCode).get()
      : Promise.resolve({ size: 0, docs: [] }),
    db().collection('purchases').get(),
    db().collection('purchaseCodes').get(),
    db().collection('settings').doc('admin').get(),
    db().collection('users').get(),
    db().collection('users').doc(request.auth.uid).collection('gemTransactions').get(),
    db().collection('users').doc(request.auth.uid).collection('notifications').orderBy('createdAt', 'desc').limit(20).get(),
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
  const gemTransactions = gemTransactionsSnapshot.docs
    .filter((document) => document.data()?.type !== 'gem_burn')
    .map((document) => {
      const data = document.data() || {};
      const labelByType = {
        daily_membership_reward: '🎉 Congratulations! You’ve Earned Cashback!',
        daily_hierarchy_distribution_reward: 'GEM Cashback',
        membership_activation_reward: 'Membership GEM Reward',
        purchase_distribution: 'Referral GEM Reward',
      };
      const normalizedAmount = Number(
        Number.isFinite(Number(data.amount))
          ? data.amount
          : Number.isFinite(Number(data.dailyGemReward))
            ? data.dailyGemReward
            : Number.isFinite(Number(data.distributionReward))
              ? data.distributionReward
              : Number(data.gemPoints ?? 0)
      );
      return {
        id: document.id,
        label: labelByType[data.type] || 'GEM Transaction',
        detail: data.tier ? `${data.tier} · ${data.type || 'reward'}` : data.type || 'reward',
        amount: Number.isFinite(normalizedAmount) ? normalizedAmount : 0,
        createdAt: data.createdAt || data.date || null,
        status: 'completed',
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

  const notifications = notificationsSnapshot.docs.map((document) => {
    const data = document.data() || {};
    return {
      id: document.id,
      title: data.title || 'Gemstone Notification',
      message: data.message || '',
      time: data.createdAt || data.updatedAt || '',
      unread: data.read === false,
      type: data.type || 'info',
    };
  });

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
    gemTransactions,
    notifications,
    hasNotifications: userData.hasNotifications === true || notifications.length > 0,
  };
});

exports.getUserTransactionLogs = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const userSnapshot = await db().collection('users').doc(request.auth.uid).get();
  const userData = userSnapshot.data() || {};
  const [purchasesSnapshot, gemTransactionsSnapshot, walletTransactionsSnapshot] = await Promise.all([
    db().collection('purchases').get(),
    db().collection('users').doc(request.auth.uid).collection('gemTransactions').get(),
    db().collection('users').doc(request.auth.uid).collection('walletTransactions').get(),
  ]);

  const belongsToUser = (data) =>
    data.userId === request.auth.uid ||
    data.uid === request.auth.uid ||
    data.ownerId === request.auth.uid ||
    data.customerId === request.auth.uid ||
    (userData.email && data.email === userData.email) ||
    (userData.username && data.username === userData.username);

  const purchases = purchasesSnapshot.docs
    .filter((document) => belongsToUser(document.data() || {}))
    .map((document) => {
      const data = document.data() || {};
      return {
        id: `purchase-${document.id}`,
        label: data.packageName || data.tier || 'Purchase',
        detail: `${data.paymentMethod === 'wallet' ? 'Wallet payment' : 'Transaction'} · ${data.status || 'completed'}`,
        amount: Number(data.total ?? data.amount ?? 0),
        amountSub: 'Purchase amount',
        createdAt: data.completedAt || data.createdAt || data.date || null,
        status: data.status || 'completed',
        positive: false,
      };
    });

  const labelByType = {
    daily_membership_reward: '🎉 Congratulations! You’ve Earned Cashback!',
    daily_hierarchy_distribution_reward: 'GEM Cashback',
    membership_activation_reward: 'Membership GEM Reward',
    purchase_distribution: 'Referral GEM Reward',
    gem_to_wallet_exchange: 'GEM to Wallet Exchange',
  };
  const rewards = gemTransactionsSnapshot.docs
    .map((document) => {
      const data = document.data() || {};
      const amount = Number(data.amount ?? data.dailyGemReward ?? data.distributionReward ?? data.gemPoints ?? 0);
      const isExchange = data.type === 'gem_to_wallet_exchange';
      const exchangeValue = Number(data.walletAmount || 0);
      return {
        id: `gem-${document.id}`,
        label: labelByType[data.type] || 'GEM Reward',
        detail: isExchange
          ? `Received ${data.currency || 'PHP'} ${exchangeValue.toFixed(2)} at ${data.currency || 'PHP'} ${Number(data.gemValue || 0).toFixed(4)} per GEM`
          : data.tier ? `${data.tier} · ${data.type || 'reward'}` : data.type || 'reward',
        amount: isExchange
          ? (Number.isFinite(amount) ? -amount : 0)
          : (Number.isFinite(amount) ? amount : 0),
        amountSub: isExchange ? 'GEMS exchanged' : 'GEMS earned',
        createdAt: data.createdAt || data.date || null,
        status: 'completed',
        positive: !isExchange,
        type: data.type || 'reward',
      };
    })
    .filter((transaction) => transaction.type !== 'gem_burn');

  const walletTransactions = walletTransactionsSnapshot.docs.map((document) => {
    const data = document.data() || {};
    const amount = Number(data.amount || 0);
    return {
      id: `wallet-${document.id}`,
      type: data.type || 'wallet_transaction',
      label: data.label || 'Wallet Transaction',
      detail: data.detail || data.referenceNo || 'Wallet activity',
      amount: data.positive === true ? Math.abs(amount) : -Math.abs(amount),
      amountSub: data.amountSub || 'Wallet amount',
      createdAt: data.createdAt || data.date || null,
      status: data.status || 'completed',
      positive: data.positive === true,
    };
  });

  return {
    transactions: [...purchases, ...rewards, ...walletTransactions]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
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
    '3M': 90 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
  };
  const windowMs = windows[range] || windows['1D'];
  const now = Date.now();
  const start = range === 'ALL' ? 0 : now - windowMs;
  const [settingsSnapshot, transactionsSnapshot, pumpsSnapshot] = await Promise.all([
    db().collection('settings').doc('admin').get(),
    db().collectionGroup('gemTransactions').get(),
    db().collection('gemValuePumps').get(),
  ]);

  const settings = settingsSnapshot.data() || {};
  const currency = settings.currency || 'PHP';
  const transactions = transactionsSnapshot.docs
    .map((document) => {
      const data = document.data() || {};
      const recordedAt = data.createdAt?.toDate
        ? data.createdAt.toDate().getTime()
        : new Date(data.createdAt || data.date || 0).getTime();
      return {
        amount: Number(data.amount || 0),
        type: data.type,
        recordedAt,
      };
    })
    .filter((transaction) => (GEM_VALUE_EARNING_TYPES.includes(transaction.type)
      || transaction.type === 'gem_burn')
      && Number.isFinite(transaction.amount)
      && transaction.amount > 0
      && Number.isFinite(transaction.recordedAt)
      && transaction.recordedAt <= now)
    .sort((a, b) => a.recordedAt - b.recordedAt);
  const pumps = pumpsSnapshot.docs
    .map((document) => {
      const data = document.data() || {};
      const recordedAt = data.createdAt?.toDate
        ? data.createdAt.toDate().getTime()
        : new Date(data.createdAt || 0).getTime();
      return { amount: Number(data.amount || 0), recordedAt };
    })
    .filter((pump) => Number.isFinite(pump.amount)
      && pump.amount > 0
      && Number.isFinite(pump.recordedAt)
      && pump.recordedAt <= now);

  let accumulatedGems = 0;
  let totalGemBurn = 0;
  let totalGemPump = 0;
  const valueEvents = [
    ...transactions.map((transaction) => ({ ...transaction, eventType: 'gem' })),
    ...pumps.map((pump) => ({ ...pump, eventType: 'pump' })),
  ].sort((a, b) => a.recordedAt - b.recordedAt);
  const points = valueEvents.map((event) => {
    if (event.eventType === 'pump') {
      totalGemPump += event.amount;
    } else if (event.type === 'gem_burn') {
      totalGemBurn += event.amount;
    } else {
      accumulatedGems += event.amount;
    }
    const snapshot = getGemValueSnapshot(accumulatedGems, totalGemBurn, totalGemPump);
    return { value: snapshot.value, recordedAt: event.recordedAt };
  }).filter((point) => point.recordedAt >= start);
  const latestSnapshot = getGemValueSnapshot(accumulatedGems, totalGemBurn, totalGemPump);
  if (points.length === 0 && accumulatedGems > 0) {
    points.push({ value: latestSnapshot.value, recordedAt: now });
  }
  if (points.length === 0) {
    points.push({ value: 0, recordedAt: now });
  }

  return {
    currency,
    defaultValue: latestSnapshot.value,
    points,
    gemPond: latestSnapshot.gemPond,
    totalAccumulatedGems: latestSnapshot.totalAccumulatedGems,
  };
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
    gemPoints: 0,
    walletBalance: 0,
    totalSpent: 0,
    mpinSetup: false,
    joinDate,
    createdAt: joinDate,
  };

  await db().collection('users').doc(userRecord.uid).set(userDoc);

  return { id: userRecord.uid, ...userDoc };
});
