/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('coach_profiles', (table) => {
    table.jsonb('availability').nullable().defaultTo('[]');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('coach_profiles', (table) => {
    table.dropColumn('availability');
  });
};
