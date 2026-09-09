const admin = require('firebase-admin');
const fs = require('fs');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Missing GOOGLE_APPLICATION_CREDENTIALS. Export a Firebase service-account JSON path before running this script.');
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'gemstonerewardsystemplat-27d57';

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
} catch (error) {
  console.error('Unable to load Firebase service account credential:', error.message);
  process.exit(1);
}

const db = getFirestore('default');
const now = new Date();
const nowIso = now.toISOString();
const todayKey = now.toISOString().slice(0, 10);

async function sendWebPushToUser(userRef, userData, amount, kind = 'daily_membership_reward') {
  const tokenSnapshot = await userRef.collection('webPushTokens').get();
  if (tokenSnapshot.empty) return;

  const title = 'Daily GEM Reward';
  const body = `You earned ${amount} GEM${amount === 1 ? '' : 's'} today.`;
  const webPayload = {
    notification: { title, body },
    data: {
      type: kind,
      amount: String(amount),
      route: '/notifications',
      userId: userData?.uid || userRef.id,
    },
  };

  const sendPromises = tokenSnapshot.docs.map(async (tokenDoc) => {
    const token = tokenDoc.data()?.token;
    if (!token) return;

    try {
      await getMessaging().send({
        token,
        notification: webPayload.notification,
        data: webPayload.data,
      });
    } catch (error) {
      console.error('Failed to send web push:', error);
    }
  });

  await Promise.all(sendPromises);
}

function nextManilaMidnight(date = new Date()) {
  const manilaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  manilaTime.setUTCHours(24, 0, 0, 0);
  return new Date(manilaTime.getTime() - (8 * 60 * 60 * 1000)).toISOString();
}

async function renderMissingDailyRewards() {
  const usersSnapshot = await db.collection('users').get();
  const usersByReferralCode = new Map();
  usersSnapshot.docs.forEach((document) => {
    const data = document.data() || {};
    if (data.referralCode) usersByReferralCode.set(data.referralCode, document);
  });

  let credited = 0;
  let skipped = 0;

  for (const userDocument of usersSnapshot.docs) {
    const userRef = userDocument.ref;
    const userData = userDocument.data() || {};
    const dailyGemReward = Number(userData.dailyGemReward || 0);
    const nextRewardAt = new Date(userData.nextGemRewardAt || 0);
    const membershipExpiresAt = userData.membershipExpiresAt ? new Date(userData.membershipExpiresAt) : null;

    if (dailyGemReward <= 0 || nextRewardAt > now) {
      continue;
    }

    if (userData.membershipStatus === 'active' && membershipExpiresAt && membershipExpiresAt.getTime() <= now.getTime()) {
      await userRef.update({ membershipStatus: 'expired', updatedAt: nowIso });
      skipped += 1;
      continue;
    }

    const rewardRef = userRef.collection('gemTransactions').doc(`daily-${todayKey}`);
    const notificationRef = userRef.collection('notifications').doc(`daily-${todayKey}-${userDocument.id}`);
    const rewardSnapshot = await rewardRef.get();

    if (!rewardSnapshot.exists) {
      const currentUser = (await userRef.get()).data() || {};
      const currentGemPoints = Number(currentUser.gemPoints || 0);
      const isMembershipActive = currentUser.membershipStatus === 'active'
        && currentUser.membershipExpiresAt
        && new Date(currentUser.membershipExpiresAt).getTime() > now.getTime();

      if (!isMembershipActive) {
        skipped += 1;
        continue;
      }

      await db.runTransaction(async (transaction) => {
        const freshUserSnap = await transaction.get(userRef);
        if (!freshUserSnap.exists) return;

        const freshUser = freshUserSnap.data() || {};
        const freshGemPoints = Number(freshUser.gemPoints || 0);

        transaction.update(userRef, {
          gemPoints: (Number.isFinite(freshGemPoints) ? freshGemPoints : 0) + dailyGemReward,
          nextGemRewardAt: nextManilaMidnight(now),
          hasNotifications: true,
          updatedAt: nowIso,
        });

        transaction.set(rewardRef, {
          type: 'daily_membership_reward',
          amount: dailyGemReward,
          tier: freshUser.membershipTier || freshUser.role || '',
          createdAt: nowIso,
        });

        transaction.set(notificationRef, {
          type: 'daily_membership_reward',
          title: 'Daily GEM Reward',
          message: `You earned ${dailyGemReward} GEM${dailyGemReward === 1 ? '' : 's'} today.`,
          amount: dailyGemReward,
          read: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      });

      await sendWebPushToUser(userRef, userData, dailyGemReward, 'daily_gem_reward');
      credited += 1;
    } else {
      skipped += 1;
    }

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
        hierarchyRecipients.push({ userRef: ancestorDocument.ref, role: 'upline', data: ancestorData, userId: ancestorDocument.id });
        selectedRecipientIds.add(ancestorDocument.id);
      } else if (ancestorRole === 'leader' && !firstLeaderFound && !selectedRecipientIds.has(ancestorDocument.id)) {
        hierarchyRecipients.push({ userRef: ancestorDocument.ref, role: 'leader', data: ancestorData, userId: ancestorDocument.id });
        selectedRecipientIds.add(ancestorDocument.id);
        firstLeaderFound = true;
      } else if (ancestorRole === 'ceo' && !firstCeoFound && !selectedRecipientIds.has(ancestorDocument.id)) {
        hierarchyRecipients.push({ userRef: ancestorDocument.ref, role: 'ceo', data: ancestorData, userId: ancestorDocument.id });
        selectedRecipientIds.add(ancestorDocument.id);
        firstCeoFound = true;
      }

      nextUplineCode = ancestorData.uplineReferralCode || '';
    }

    for (const recipient of hierarchyRecipients) {
      try {
        const recipientRef = recipient.userRef;
        const recipientData = recipient.data || {};
        const recipientStatus = String(recipientData.status || 'active').toLowerCase();
        if (recipientStatus !== 'active') continue;

        const recipientRewardRef = recipientRef.collection('gemTransactions')
          .doc(`daily-hierarchy-${todayKey}-${userDocument.id}-${recipient.role}`);
        const recipientNotificationRef = recipientRef.collection('notifications')
          .doc(`daily-hierarchy-${todayKey}-${userDocument.id}-${recipient.role}`);

        const recipientRewardSnapshot = await recipientRewardRef.get();
        if (recipientRewardSnapshot.exists) {
          continue;
        }

        await db.runTransaction(async (transaction) => {
          const recipientSnapshot = await transaction.get(recipientRef);
          if (!recipientSnapshot.exists) return;

          const latestRecipient = recipientSnapshot.data() || {};
          const latestGemPoints = Number(latestRecipient.gemPoints || 0);

          transaction.update(recipientRef, {
            gemPoints: (Number.isFinite(latestGemPoints) ? latestGemPoints : 0) + dailyGemReward,
            hasNotifications: true,
            updatedAt: nowIso,
          });

          transaction.set(recipientRewardRef, {
            type: 'daily_hierarchy_distribution_reward',
            amount: dailyGemReward,
            role: recipient.role,
            sourceUserId: userDocument.id,
            tier: latestRecipient.membershipTier || latestRecipient.role || '',
            createdAt: nowIso,
          });

          transaction.set(recipientNotificationRef, {
            type: 'daily_hierarchy_distribution_reward',
            title: 'Daily GEM Reward',
            message: `You earned ${dailyGemReward} GEM${dailyGemReward === 1 ? '' : 's'} from ${userData.name || userData.username || userDocument.id}'s daily reward.`,
            amount: dailyGemReward,
            read: false,
            role: recipient.role,
            sourceUserId: userDocument.id,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        });

        await sendWebPushToUser(recipientRef, recipientData, dailyGemReward, 'daily_gem_reward');
        credited += 1;
      } catch (error) {
        console.error('Failed to distribute hierarchy reward:', error);
      }
    }
  }

  console.log(`Rendered daily rewards: credited=${credited}; skipped=${skipped}`);
}

renderMissingDailyRewards().catch((error) => {
  console.error('renderMissingDailyRewards failed:', error);
  process.exitCode = 1;
});
