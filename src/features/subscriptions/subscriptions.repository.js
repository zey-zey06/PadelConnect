const db = require('../../db');

const PRICE_PER_VENUE = 3000; // FCFA per venue per month

async function getOrgSubscriptionStatus(orgId) {
  const org = await db('organizations')
    .where('id', orgId)
    .select('id', 'name', 'subscription_status', 'trial_ends_at')
    .first();
  if (!org) return null;

  const [{ count: rawCount }] = await db('venues')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .count('id as count');
  const venueCount = parseInt(rawCount, 10);

  const lastSub = await db('subscriptions')
    .where({ organization_id: orgId, status: 'active' })
    .orderBy('current_period_end', 'desc')
    .first();

  const now = new Date();
  let daysRemaining = 0;
  let periodEnd = null;

  if (org.subscription_status === 'trial' && org.trial_ends_at) {
    daysRemaining = Math.max(0, Math.ceil((new Date(org.trial_ends_at) - now) / 86400000));
    periodEnd = org.trial_ends_at;
  } else if (org.subscription_status === 'active' && lastSub) {
    daysRemaining = Math.max(0, Math.ceil((new Date(lastSub.current_period_end) - now) / 86400000));
    periodEnd = lastSub.current_period_end;
  }

  return {
    status: org.subscription_status,
    trial_ends_at: org.trial_ends_at,
    venue_count: venueCount,
    price_per_venue: PRICE_PER_VENUE,
    amount_due: Math.max(venueCount, 1) * PRICE_PER_VENUE,
    days_remaining: daysRemaining,
    period_end: periodEnd,
    last_subscription: lastSub || null,
  };
}

async function isOrgSubscriptionActive(orgId) {
  const org = await db('organizations')
    .where('id', orgId)
    .select('subscription_status', 'trial_ends_at')
    .first();
  if (!org) return false;
  if (org.subscription_status === 'active') return true;
  if (
    org.subscription_status === 'trial' &&
    org.trial_ends_at &&
    new Date(org.trial_ends_at) > new Date()
  ) return true;
  return false;
}

async function getHistory(orgId) {
  return db('subscriptions')
    .where({ organization_id: orgId })
    .orderBy('created_at', 'desc')
    .select('*');
}

async function createSubscription(orgId, venueCount, paymentMethod) {
  const now       = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const amount = Math.max(venueCount, 1) * PRICE_PER_VENUE;

  const [sub] = await db('subscriptions').insert({
    organization_id:      orgId,
    plan:                 'venue_monthly',
    amount,
    venue_count:          venueCount,
    status:               'active',
    payment_method:       paymentMethod,
    current_period_start: now,
    current_period_end:   periodEnd,
    paid_at:              now,
  }).returning('*');

  await db('organizations').where('id', orgId).update({ subscription_status: 'active' });
  return sub;
}

async function getAllOrgSubscriptions() {
  const orgs = await db('organizations')
    .whereNull('deleted_at')
    .select('id', 'name', 'subscription_status', 'trial_ends_at', 'created_at')
    .orderBy('created_at', 'desc');

  if (orgs.length === 0) return { clubs: [], revenue_this_month: 0 };

  const orgIds = orgs.map((o) => o.id);

  const [venueCounts, lastSubResult, revenueRow] = await Promise.all([
    db('venues')
      .whereIn('organization_id', orgIds)
      .whereNull('deleted_at')
      .select('organization_id')
      .count('id as count')
      .groupBy('organization_id'),

    db.raw(`
      SELECT DISTINCT ON (organization_id)
        id, organization_id, amount, venue_count, status,
        payment_method, current_period_start, current_period_end, paid_at
      FROM subscriptions
      WHERE organization_id = ANY(?)
        AND status = 'active'
      ORDER BY organization_id, current_period_end DESC
    `, [orgIds]),

    db('subscriptions')
      .whereRaw("paid_at >= date_trunc('month', CURRENT_DATE)")
      .sum('amount as total')
      .first(),
  ]);

  const venueMap  = Object.fromEntries(venueCounts.map((r) => [r.organization_id, parseInt(r.count, 10)]));
  const lastSubMap = Object.fromEntries(lastSubResult.rows.map((r) => [r.organization_id, r]));

  const now = new Date();

  const clubs = orgs.map((org) => {
    const lastSub = lastSubMap[org.id] || null;
    const vCount  = venueMap[org.id] ?? 0;
    let daysRemaining = 0;

    if (org.subscription_status === 'trial' && org.trial_ends_at) {
      daysRemaining = Math.max(0, Math.ceil((new Date(org.trial_ends_at) - now) / 86400000));
    } else if (org.subscription_status === 'active' && lastSub) {
      daysRemaining = Math.max(0, Math.ceil((new Date(lastSub.current_period_end) - now) / 86400000));
    }

    return {
      ...org,
      venue_count:       vCount,
      amount_due:        Math.max(vCount, 1) * PRICE_PER_VENUE,
      days_remaining:    daysRemaining,
      last_subscription: lastSub,
    };
  });

  return {
    clubs,
    revenue_this_month: parseFloat(revenueRow?.total ?? 0),
  };
}

async function updateOrgStatus(orgId, status) {
  await db('organizations').where('id', orgId).update({ subscription_status: status });
}

async function suspendExpired() {
  const now = new Date();

  const expiredTrials = await db('organizations')
    .where({ subscription_status: 'trial' })
    .where('trial_ends_at', '<', now)
    .update({ subscription_status: 'suspended' });

  const expiredSubs = await db('organizations')
    .where({ subscription_status: 'active' })
    .whereNotExists(function () {
      this.select('id')
        .from('subscriptions')
        .whereRaw('subscriptions.organization_id = organizations.id')
        .where('subscriptions.status', 'active')
        .where('subscriptions.current_period_end', '>=', now);
    })
    .update({ subscription_status: 'suspended' });

  return { expired_trials: expiredTrials ?? 0, expired_subs: expiredSubs ?? 0 };
}

module.exports = {
  PRICE_PER_VENUE,
  getOrgSubscriptionStatus,
  isOrgSubscriptionActive,
  getHistory,
  createSubscription,
  getAllOrgSubscriptions,
  updateOrgStatus,
  suspendExpired,
};
