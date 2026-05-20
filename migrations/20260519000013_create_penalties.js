/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('penalties', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.decimal('amount', 10, 2).notNullable().defaultTo(0);
    table.boolean('paid').notNullable().defaultTo(false);
    table.timestamp('expires_at').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('penalties');
};
