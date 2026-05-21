/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('bookings', (table) => {
    table.string('payment_method').notNullable().defaultTo('on_arrival');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('bookings', (table) => {
    table.dropColumn('payment_method');
  });
};
