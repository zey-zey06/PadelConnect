exports.up = async function (knex) {
  await knex.schema.alterTable('organizations', (table) => {
    table.string('subscription_status', 20).notNullable().defaultTo('trial');
    table.timestamp('trial_ends_at');
  });
  // Backfill trial_ends_at based on each club's registration date
  await knex.raw(`
    UPDATE organizations
    SET trial_ends_at = created_at + INTERVAL '30 days'
    WHERE trial_ends_at IS NULL
  `);
};

exports.down = function (knex) {
  return knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('subscription_status');
    table.dropColumn('trial_ends_at');
  });
};
