/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('club_invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('coach_user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('invited_by').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    // pending / accepted / refused
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamps(true, true);
    table.index(['coach_user_id', 'status']);
    table.index('organization_id');
  });

  // Only one active (pending) invitation per coach per club
  await knex.raw(`
    CREATE UNIQUE INDEX club_invitations_pending_unique
    ON club_invitations (organization_id, coach_user_id)
    WHERE status = 'pending'
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('club_invitations');
};
