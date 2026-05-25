/**
 * Migration 036 — Create friendships table
 * Tracks friend requests between players.
 * status: 'pending' | 'accepted' | 'refused'
 * requester_id is the user who sent the request.
 * addressee_id is the user who received it.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('friendships', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('addressee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('status', 20).notNullable().defaultTo('pending');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // A pair can only have one friendship record in each direction
    t.unique(['requester_id', 'addressee_id'], 'friendships_pair_unique');
  });

  // Prevent self-friendship
  await knex.raw('ALTER TABLE friendships ADD CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('friendships');
};
