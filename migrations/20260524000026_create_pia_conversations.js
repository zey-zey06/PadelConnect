/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('pia_conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // JSONB array of { role: 'user'|'model', text: string, ts: ISO string }
    table.jsonb('messages').notNullable().defaultTo('[]');
    table.timestamps(true, true);
    table.index('user_id');
    table.index('updated_at'); // used for rate-limit window queries
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pia_conversations');
};
