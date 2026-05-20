/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('role').notNullable();
    table.string('status').notNullable().defaultTo('active');
    table.text('ban_reason').nullable();
    table.timestamp('banned_until').nullable();
    table.integer('no_show_count').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
