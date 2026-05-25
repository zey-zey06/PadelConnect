const subsRepo = require('./subscriptions.repository');

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
  return subsRepo.createSubscription(orgId, status.venue_count, paymentMethod);
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
    const result = await subsRepo.suspendExpired();
    if (result.expired_trials > 0 || result.expired_subs > 0) {
      console.log(JSON.stringify({ level: 'info', event: 'subscriptions_expired', ...result }));
    }
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'subscriptions_cron_error', error: err.message }));
  }
}

module.exports = { getMySubscription, getHistory, pay, getAllSubscriptions, activate, suspend, runCron };
