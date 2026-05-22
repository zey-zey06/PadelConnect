/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('first_name', 50).nullable().defaultTo(null);
    t.string('last_name',  50).nullable().defaultTo(null);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('first_name');
    t.dropColumn('last_name');
  });
};
