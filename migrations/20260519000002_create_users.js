/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['player', 'venue_admin', 'coach', 'ball_picker', 'super_admin']).notNullable().defaultTo('player');
    t.enu('status', ['active', 'banned_club', 'banned_app']).notNullable().defaultTo('active');
    t.text('ban_reason').nullable();
    t.timestamp('banned_until').nullable();
    t.integer('no_show_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
  });

  await knex.schema.alterTable('users', (t) => {
    t.index('organization_id');
    t.index('email');
    t.index('role');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('users');
};
