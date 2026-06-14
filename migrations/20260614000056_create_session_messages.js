exports.up = (knex) =>
  knex.schema.createTable('session_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('content').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['session_id', 'created_at']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('session_messages');
