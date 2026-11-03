const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || 'gemstonerewardsystemplat-27d57';
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function parseArguments() {
  if (args.includes('--help')) {
    console.log('Usage: node scripts/recover-missed-membership-earning.js --purchase-id <id> --day <number> --date <YYYY-MM-DD> [--apply]');
    console.log('Requires Google Application Default Credentials: gcloud auth application-default login');
    process.exit(0);
  }

  const purchaseId = getArgument('--purchase-id');
  const dayNumber = Number(getArgument('--day'));
  const earningDate = getArgument('--date');

  if (!purchaseId || !Number.isInteger(dayNumber) || !earningDate) {
    throw new Error('Provide --purchase-id, --day, and --date. Use --help for usage.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(earningDate)) {
    throw new Error('--date must use YYYY-MM-DD format.');
  }

  return { purchaseId, dayNumber, earningDate };
}

function manilaDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function membershipDayNumber(startDate, earningDate) {
  const [startYear, startMonth, startDay] = manilaDateKey(startDate).split('-').map(Number);
  const [earningYear, earningMonth, earningDay] = earningDate.split('-').map(Number);
  const startDayUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const earningDayUtc = Date.UTC(earningYear, earningMonth - 1, earningDay);
  return Math.floor((earningDayUtc - startDayUtc) / (24 * 60 * 60 * 1000)) + 1;
}

function earningDateStart(earningDate) {
  return new Date(`${earningDate}T00:00:00+08:00`);
}

function hasEarningForDay(snapshot, dayNumber, allowedTypes) {
  return snapshot.docs.some((document) => {
    const data = document.data() || {};
    return Number(data.dayNumber ?? data.earningNumber) === dayNumber
      && allowedTypes.includes(data.type);
  });
}

async function main() {
  const { purchaseId, dayNumber, earningDate } = parseArguments();
  if (dayNumber < 2 || dayNumber > 45) {
    throw new Error('--day must be between 2 and 45; day 1 is credited at purchase time.');
  }

  const parsedEarningDate = earningDateStart(earningDate);
  if (manilaDateKey(parsedEarningDate) !== earningDate) {
    throw new Error('--date is not a valid Manila calendar date.');
  }
  if (parsedEarningDate.getTime() > Date.now()) {
    throw new Error('--date cannot be in the future.');
  }

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const firestore = getFirestore(undefined, 'default');
  const purchaseRef = firestore.collection('purchases').doc(purchaseId);
  const purchaseSnapshot = await purchaseRef.get();
  if (!purchaseSnapshot.exists) throw new Error(`Purchase ${purchaseId} was not found.`);

  const purchase = purchaseSnapshot.data() || {};
  if (String(purchase.status || '').toLowerCase() !== 'completed') {
    throw new Error('Only completed purchases can be recovered.');
  }

  const userId = purchase.userId || purchase.uid;
  if (!userId) throw new Error('The purchase has no userId or uid.');

  const startDateValue = purchase.membershipStartedAt
    || purchase.completedAt
    || purchase.createdAt
    || purchase.date;
  const membershipStartDate = startDateValue?.toDate
    ? startDateValue.toDate()
    : new Date(startDateValue || 0);
  if (Number.isNaN(membershipStartDate.getTime())) {
    throw new Error('The purchase has no valid membership start date.');
  }

  const actualDayNumber = membershipDayNumber(membershipStartDate, earningDate);
  if (actualDayNumber !== dayNumber) {
    throw new Error(`The purchase maps to day ${actualDayNumber} on ${earningDate}, not day ${dayNumber}.`);
  }

  const membershipExpiresAt = purchase.membershipExpiresAt?.toDate
    ? purchase.membershipExpiresAt.toDate()
    : new Date(purchase.membershipExpiresAt || membershipStartDate.getTime() + (45 * 24 * 60 * 60 * 1000));
  if (Number.isNaN(membershipExpiresAt.getTime())
    || parsedEarningDate.getTime() >= membershipExpiresAt.getTime()) {
    throw new Error('The membership was not active on the requested earning date.');
  }

  const dailyGemReward = Number(purchase.dailyGemReward ?? purchase.purchaserReward ?? 0);
  if (!Number.isFinite(dailyGemReward) || dailyGemReward <= 0) {
    throw new Error('The purchase has no valid dailyGemReward or purchaserReward.');
  }

  const userRef = firestore.collection('users').doc(userId);
  const recipientList = Array.isArray(purchase.distribution)
    ? purchase.distribution
      .filter((recipient) => recipient?.userId && recipient.userId !== userId)
      .map((recipient) => ({
        userId: recipient.userId,
        role: recipient.role || 'upline',
        amount: Number(recipient.amount ?? purchase.distributionReward ?? 0),
      }))
      .filter((recipient, index, recipients) => recipients.findIndex((candidate) =>
        candidate.userId === recipient.userId && candidate.role === recipient.role) === index)
    : [];

  const distributionReward = Number(purchase.distributionReward || 0);
  const resolvedRecipients = recipientList.map((recipient) => ({
    ...recipient,
    amount: Number.isFinite(recipient.amount) && recipient.amount > 0
      ? recipient.amount
      : distributionReward,
    userRef: firestore.collection('users').doc(recipient.userId),
    rewardId: `daily-hierarchy-${purchaseId}-${earningDate}-${userId}-${recipient.role}`,
  }));

  if (resolvedRecipients.some((recipient) => !Number.isFinite(recipient.amount) || recipient.amount <= 0)) {
    throw new Error('The purchase distribution contains an invalid reward amount.');
  }

  const memberRewardId = `daily-${purchaseId}-${earningDate}`;
  const memberRewardRef = userRef.collection('gemTransactions').doc(memberRewardId);
  const memberNotificationRef = userRef.collection('notifications').doc(memberRewardId);
  const memberPurchaseQuery = userRef.collection('gemTransactions').where('purchaseId', '==', purchaseId);
  const safetyNetEarning = dayNumber % 5 === 0;
  const memberRewardType = safetyNetEarning ? 'gem_burn' : 'daily_membership_reward';
  const recoveredAt = new Date().toISOString();
  const tier = purchase.tier || purchase.packageName || '';

  console.log(`${applyChanges ? 'APPLY' : 'DRY RUN'}: ${purchase.packageName || tier} purchase ${purchaseId}`);
  console.log(`Member: ${userId}; earning date: ${earningDate}; day: ${dayNumber}; amount: ${dailyGemReward} GEM`);
  console.log(`Distribution recipients: ${resolvedRecipients.length}`);

  if (!applyChanges) {
    console.log('No writes performed. Add --apply to commit missing reward records.');
    return;
  }

  const result = await firestore.runTransaction(async (transaction) => {
    const [userSnapshot, memberRewardSnapshot, memberPurchaseRewardsSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(memberRewardRef),
      transaction.get(memberPurchaseQuery),
    ]);
    if (!userSnapshot.exists) throw new Error(`User ${userId} was not found.`);
    const userData = userSnapshot.data() || {};

    const recipientReads = await Promise.all(resolvedRecipients.map(async (recipient) => {
      const rewardRef = recipient.userRef.collection('gemTransactions').doc(recipient.rewardId);
      const rewardsQuery = recipient.userRef.collection('gemTransactions')
        .where('purchaseId', '==', purchaseId);
      const [recipientSnapshot, rewardSnapshot, purchaseRewardsSnapshot] = await Promise.all([
        transaction.get(recipient.userRef),
        transaction.get(rewardRef),
        transaction.get(rewardsQuery),
      ]);
      return { ...recipient, rewardRef, recipientSnapshot, rewardSnapshot, purchaseRewardsSnapshot };
    }));

    const writes = { member: false, recipients: [] };
    const memberAlreadyCredited = memberRewardSnapshot.exists
      || hasEarningForDay(memberPurchaseRewardsSnapshot, dayNumber, ['daily_membership_reward', 'gem_burn']);

    if (!memberAlreadyCredited) {
      const gemPoints = Number(userData.gemPoints || 0);
      transaction.update(userRef, {
        ...(safetyNetEarning
          ? {}
          : { gemPoints: (Number.isFinite(gemPoints) ? gemPoints : 0) + dailyGemReward }),
        hasNotifications: true,
        updatedAt: recoveredAt,
      });
      transaction.set(memberRewardRef, {
        type: memberRewardType,
        amount: dailyGemReward,
        earningNumber: dayNumber,
        dayNumber,
        ...(safetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
        purchaseId,
        tier,
        earningDate,
        source: 'one_time_recovery',
        createdAt: parsedEarningDate.toISOString(),
        recoveredAt,
      });
      transaction.set(memberNotificationRef, {
        type: memberRewardType,
        title: safetyNetEarning
          ? 'Earnings Company Safety Net'
          : '🎉 Congratulations! You’ve Earned Cashback!',
        message: safetyNetEarning
          ? `Day ${dayNumber}: ${dailyGemReward} GEM${dailyGemReward === 1 ? '' : 's'} from your membership cashback was added to the company safety net.`
          : 'Your cashback has been successfully added to your GEM Points.',
        amount: dailyGemReward,
        dayNumber,
        ...(safetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
        purchaseId,
        tier,
        earningDate,
        source: 'one_time_recovery',
        read: false,
        createdAt: parsedEarningDate.toISOString(),
        updatedAt: recoveredAt,
      });
      writes.member = true;
    }

    for (const recipient of recipientReads) {
      const alreadyCredited = recipient.rewardSnapshot.exists
        || hasEarningForDay(
          recipient.purchaseRewardsSnapshot,
          dayNumber,
          ['daily_hierarchy_distribution_reward', 'gem_burn'],
        ) && recipient.purchaseRewardsSnapshot.docs.some((document) => {
          const data = document.data() || {};
          return Number(data.dayNumber ?? data.earningNumber) === dayNumber
            && data.role === recipient.role
            && data.sourceUserId === userId;
        });

      if (!recipient.recipientSnapshot.exists || alreadyCredited) continue;

      const recipientData = recipient.recipientSnapshot.data() || {};
      const gemPoints = Number(recipientData.gemPoints || 0);
      const rewardType = safetyNetEarning ? 'gem_burn' : 'daily_hierarchy_distribution_reward';
      const rewardRef = recipient.rewardRef;
      const notificationRef = recipient.userRef.collection('notifications').doc(recipient.rewardId);

      transaction.update(recipient.userRef, {
        ...(safetyNetEarning
          ? {}
          : { gemPoints: (Number.isFinite(gemPoints) ? gemPoints : 0) + recipient.amount }),
        hasNotifications: true,
        updatedAt: recoveredAt,
      });
      transaction.set(rewardRef, {
        type: rewardType,
        amount: recipient.amount,
        earningNumber: dayNumber,
        dayNumber,
        ...(safetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
        purchaseId,
        role: recipient.role,
        sourceUserId: userId,
        tier: recipientData.membershipTier || recipientData.role || '',
        earningDate,
        source: 'one_time_recovery',
        createdAt: parsedEarningDate.toISOString(),
        recoveredAt,
      });
      transaction.set(notificationRef, {
        type: rewardType,
        title: safetyNetEarning ? 'Earnings Company Safety Net' : 'GEM Cashback',
        message: safetyNetEarning
          ? `Day ${dayNumber}: ${recipient.amount} GEM${recipient.amount === 1 ? '' : 's'} from ${userData.name || userData.username || userId}'s membership cashback was added to the company safety net.`
          : `Day ${dayNumber}: You earned ${recipient.amount} GEM${recipient.amount === 1 ? '' : 's'} from ${userData.name || userData.username || userId}'s ${String(tier || 'membership').toUpperCase()} membership.`,
        amount: recipient.amount,
        dayNumber,
        ...(safetyNetEarning ? { reason: 'Earnings Company Safety Net' } : {}),
        purchaseId,
        role: recipient.role,
        sourceUserId: userId,
        earningDate,
        source: 'one_time_recovery',
        read: false,
        createdAt: parsedEarningDate.toISOString(),
        updatedAt: recoveredAt,
      });
      writes.recipients.push({ userId: recipient.userId, role: recipient.role, amount: recipient.amount });
    }

    return writes;
  });

  console.log(`Recovery complete. Member reward written: ${result.member}.`);
  console.log(`Distribution rewards written: ${result.recipients.length}.`);
}

main().catch((error) => {
  console.error(`Recovery failed: ${error.message}`);
  process.exitCode = 1;
});