/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('player_profiles', (table) => {
    table.text('motivation_answer').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('player_profiles', (table) => {
    table.dropColumn('motivation_answer');
  });
};
