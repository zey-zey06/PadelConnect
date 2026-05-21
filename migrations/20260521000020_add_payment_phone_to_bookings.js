/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('bookings', (table) => {
    table.string('payment_phone').nullable(); // +225XXXXXXXXXX for Wave / Orange Money
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('bookings', (table) => {
    table.dropColumn('payment_phone');
  });
};
