/**
 * Data-fix migration: activate all organizations that are still stuck on
 * 'trial' with a NULL or past trial_ends_at.
 *
 * Root cause: the seed file omitted subscription_status / trial_ends_at, so
 * Knex used the column default ('trial') and the backfill query from migration
 * 20260525000033 had already run — leaving trial_ends_at NULL on every
 * re-seeded row.  listWithStats() filters to active | unexpired-trial, so all
 * clubs were hidden from the public listing.
 *
 * Fix: set subscription_status = 'active' for every organization that is not
 * already active, so clubs appear immediately regardless of trial expiry.
 */
exports.up = async function (knex) {
  await knex('organizations')
    .whereNot('subscription_status', 'active')
    .update({
      subscription_status: 'active',
      trial_ends_at: knex.raw("NOW() + INTERVAL '30 days'"),
      updated_at: knex.raw('NOW()'),
    });
};

exports.down = function (_knex) {
  // Intentionally a no-op: reverting an activation would hide live clubs.
};
