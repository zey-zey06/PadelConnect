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
    .select('status', 'subscription_status', 'trial_ends_at')
    .first();
  if (!org) return false;
  if (org.status === 'pending_validation') return false;
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

async function getManagerEmailByOrgId(orgId) {
  const user = await db('users')
    .where({ organization_id: orgId, role: 'venue_admin' })
    .whereNull('deleted_at')
    .select('email')
    .first();
  return user?.email ?? null;
}

async function getOrgsExpiringInDays(daysAhead) {
  const lo = new Date(Date.now() + (daysAhead - 1) * 86400000);
  const hi = new Date(Date.now() + daysAhead * 86400000);

  const [trialOrgs, subOrgs] = await Promise.all([
    db('organizations')
      .where({ subscription_status: 'trial' })
      .whereNull('deleted_at')
      .whereBetween('trial_ends_at', [lo, hi])
      .select('id', 'name'),

    db('organizations as o')
      .join('subscriptions as s', 's.organization_id', 'o.id')
      .where('o.subscription_status', 'active')
      .where('s.status', 'active')
      .whereNull('o.deleted_at')
      .whereBetween('s.current_period_end', [lo, hi])
      .select('o.id', 'o.name', 's.venue_count'),
  ]);

  const seen = new Set();
  const all  = [...trialOrgs, ...subOrgs].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  return Promise.all(
    all.map(async (org) => ({
      ...org,
      manager_email: await getManagerEmailByOrgId(org.id),
    }))
  );
}

async function suspendExpired() {
  const now = new Date();

  // Capture orgs before suspending so we can email them
  const [trialsToSuspend, activesToSuspend] = await Promise.all([
    db('organizations')
      .where({ subscription_status: 'trial' })
      .where('trial_ends_at', '<', now)
      .whereNull('deleted_at')
      .select('id', 'name'),

    db('organizations')
      .where({ subscription_status: 'active' })
      .whereNotExists(function () {
        this.select('id').from('subscriptions')
          .whereRaw('subscriptions.organization_id = organizations.id')
          .where('subscriptions.status', 'active')
          .where('subscriptions.current_period_end', '>=', now);
      })
      .whereNull('deleted_at')
      .select('id', 'name'),
  ]);

  let expired_trials = 0;
  let expired_subs   = 0;

  if (trialsToSuspend.length) {
    expired_trials = await db('organizations')
      .whereIn('id', trialsToSuspend.map((o) => o.id))
      .update({ subscription_status: 'suspended' });
  }
  if (activesToSuspend.length) {
    expired_subs = await db('organizations')
      .whereIn('id', activesToSuspend.map((o) => o.id))
      .update({ subscription_status: 'suspended' });
  }

  const allSuspended = [...trialsToSuspend, ...activesToSuspend];
  const suspendedOrgs = await Promise.all(
    allSuspended.map(async (org) => ({
      ...org,
      manager_email: await getManagerEmailByOrgId(org.id),
    }))
  );

  return { expired_trials: expired_trials || 0, expired_subs: expired_subs || 0, suspendedOrgs };
}

// ── Revenue reporting ─────────────────────────────────────────────────────────

async function getRevenueList(period = 'all') {
  const now = new Date();
  let query = db('subscriptions')
    .join('organizations', 'subscriptions.organization_id', 'organizations.id')
    .orderBy('subscriptions.paid_at', 'desc');

  if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.where('subscriptions.paid_at', '>=', monthStart);
  } else if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    query = query.where('subscriptions.paid_at', '>=', weekStart);
  }

  return query.select([
    'subscriptions.id',
    'subscriptions.organization_id',
    'subscriptions.amount',
    'subscriptions.venue_count',
    'subscriptions.payment_method',
    'subscriptions.paid_at',
    'subscriptions.current_period_start',
    'subscriptions.current_period_end',
    'subscriptions.status',
    'organizations.name as club_name',
    'organizations.subscription_status as org_subscription_status',
  ]);
}

async function getRevenueTotals() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [monthRow, weekRow, allRow, activeCount, pendingCount] = await Promise.all([
    db('subscriptions').where('paid_at', '>=', monthStart).sum('amount as total').first(),
    db('subscriptions').where('paid_at', '>=', weekStart).sum('amount as total').first(),
    db('subscriptions').sum('amount as total').first(),
    db('organizations').where('subscription_status', 'active').whereNull('deleted_at').count('id as c').first(),
    db('organizations').where('subscription_status', 'trial').whereNull('deleted_at').count('id as c').first(),
  ]);

  return {
    revenue_this_month: parseFloat(monthRow?.total ?? 0),
    revenue_this_week:  parseFloat(weekRow?.total ?? 0),
    revenue_all_time:   parseFloat(allRow?.total ?? 0),
    active_clubs:  parseInt(activeCount?.c ?? 0, 10),
    pending_clubs: parseInt(pendingCount?.c ?? 0, 10),
  };
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
  getManagerEmailByOrgId,
  getOrgsExpiringInDays,
  getRevenueList,
  getRevenueTotals,
};
