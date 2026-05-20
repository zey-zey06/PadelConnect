/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('session_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('pending');
    table.integer('ai_score').nullable();
    table.text('ai_explanation').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('session_requests');
};
