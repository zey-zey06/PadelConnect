const subsRepo = require('./subscriptions.repository');
const {
  sendSubscriptionReceipt,
  sendSubscriptionReminder,
  sendSubscriptionSuspended,
} = require('../../emails/club');

async function getMySubscription(orgId) {
  return subsRepo.getOrgSubscriptionStatus(orgId);
}

async function getHistory(orgId) {
  return subsRepo.getHistory(orgId);
}

async function pay(orgId, paymentMethod) {
  const status = await subsRepo.getOrgSubscriptionStatus(orgId);
  if (!status) {
    const err = new Error('Organisation introuvable.');
    err.status = 404;
    throw err;
  }
  const sub = await subsRepo.createSubscription(orgId, status.venue_count, paymentMethod);

  // Send receipt email to manager — non-fatal
  try {
    const managerEmail = await subsRepo.getManagerEmailByOrgId(orgId);
    if (managerEmail) {
      sendSubscriptionReceipt({
        clubName:     status.name ?? '',
        managerEmail,
        venueCount:   sub.venue_count,
        amount:       sub.amount,
        periodStart:  sub.current_period_start,
        periodEnd:    sub.current_period_end,
      }).catch(() => {});
    }
  } catch { /* non-fatal */ }

  return sub;
}

async function getAllSubscriptions() {
  return subsRepo.getAllOrgSubscriptions();
}

async function activate(orgId) {
  return subsRepo.updateOrgStatus(orgId, 'active');
}

async function suspend(orgId) {
  return subsRepo.updateOrgStatus(orgId, 'suspended');
}

async function runCron() {
  try {
    // 1. Send reminders for subscriptions expiring in 7 days
    const expiring = await subsRepo.getOrgsExpiringInDays(7);
    for (const org of expiring) {
      if (org.manager_email) {
        const subStatus = await subsRepo.getOrgSubscriptionStatus(org.id).catch(() => null);
        sendSubscriptionReminder({
          clubName:     org.name,
          managerEmail: org.manager_email,
          daysLeft:     7,
          amountDue:    subStatus?.amount_due ?? 0,
        }).catch(() => {});
      }
    }

    // 2. Suspend expired and send suspension emails
    const { expired_trials, expired_subs, suspendedOrgs } = await subsRepo.suspendExpired();
    for (const org of suspendedOrgs) {
      if (org.manager_email) {
        sendSubscriptionSuspended({
          clubName:     org.name,
          managerEmail: org.manager_email,
        }).catch(() => {});
      }
    }

    if (expired_trials > 0 || expired_subs > 0) {
      console.log(JSON.stringify({ level: 'info', event: 'subscriptions_expired', expired_trials, expired_subs }));
    }
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'subscriptions_cron_error', error: err.message }));
  }
}

async function getRevenue(period) {
  const [payments, totals] = await Promise.all([
    subsRepo.getRevenueList(period),
    subsRepo.getRevenueTotals(),
  ]);
  return { payments, ...totals };
}

async function markPaidManual(orgId) {
  const status = await subsRepo.getOrgSubscriptionStatus(orgId);
  if (!status) {
    const err = new Error('Organisation introuvable.'); err.status = 404; throw err;
  }
  return subsRepo.createSubscription(orgId, status.venue_count, 'on_arrival');
}

module.exports = { getMySubscription, getHistory, pay, getAllSubscriptions, activate, suspend, runCron, getRevenue, markPaidManual };
