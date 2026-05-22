/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('player_profiles', (table) => {
    table.string('phone_number').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('player_profiles', (table) => {
    table.dropColumn('phone_number');
  });
};
