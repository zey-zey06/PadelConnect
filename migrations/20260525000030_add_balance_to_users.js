/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.decimal('balance', 14, 2).defaultTo(0).notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('balance');
  });
};
