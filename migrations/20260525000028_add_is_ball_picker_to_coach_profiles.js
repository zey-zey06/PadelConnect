/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('coach_profiles', (table) => {
    table.boolean('is_ball_picker').notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('coach_profiles', (table) => {
    table.dropColumn('is_ball_picker');
  });
};
