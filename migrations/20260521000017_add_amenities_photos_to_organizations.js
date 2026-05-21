/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.jsonb('amenities').nullable();
    table.jsonb('photos_urls').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.dropColumns('amenities', 'photos_urls');
  });
};
