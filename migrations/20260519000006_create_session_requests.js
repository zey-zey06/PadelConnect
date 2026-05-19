/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('session_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['pending', 'accepted', 'rejected']).notNullable().defaultTo('pending');
    // ai_score: 0-100, null until IA has evaluated the request
    t.integer('ai_score').nullable();
    t.text('ai_explanation').nullable();
    t.timestamps(true, true);

    t.unique(['session_id', 'player_id']);
    t.index('session_id');
    t.index('player_id');
    t.index('status');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('session_requests');
};
