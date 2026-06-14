exports.up = (knex) =>
  knex.schema.createTable('session_feedback', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('emoji', 20).notNullable(); // 'super' | 'correct' | 'decevant'
    t.string('comment', 150).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['session_id', 'user_id']); // one feedback per user per session
  });

exports.down = (knex) => knex.schema.dropTableIfExists('session_feedback');
