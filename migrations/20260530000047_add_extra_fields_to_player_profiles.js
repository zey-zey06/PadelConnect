/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('player_profiles', (table) => {
    table.text('preferred_time').nullable(); // e.g. "Matin", "Soir"
    table.text('age_range').nullable();      // e.g. "18-25 ans"
    table.text('availability').nullable();   // e.g. "En semaine", "Week-end uniquement"
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('player_profiles', (table) => {
    table.dropColumn('preferred_time');
    table.dropColumn('age_range');
    table.dropColumn('availability');
  });
};
