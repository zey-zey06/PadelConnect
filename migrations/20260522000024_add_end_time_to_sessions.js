/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('sessions', (t) => {
    t.time('end_time').nullable().defaultTo(null);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('sessions', (t) => {
    t.dropColumn('end_time');
  });
};
