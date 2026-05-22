/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('session_requests', (t) => {
    // 'player' = standard join request, 'coach' = creator-initiated coach invite
    t.string('role', 20).notNullable().defaultTo('player');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('session_requests', (t) => {
    t.dropColumn('role');
  });
};
