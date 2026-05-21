/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.text('description').nullable();
    table.string('address').nullable();
    table.string('phone').nullable();
    table.string('logo_url').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.dropColumns('description', 'address', 'phone', 'logo_url');
  });
};
