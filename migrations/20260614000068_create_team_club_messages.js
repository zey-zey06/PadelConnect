exports.up = async (knex) => {
  await knex.schema.createTable('team_club_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('chat_id').notNullable().references('id').inTable('team_club_chats').onDelete('CASCADE');
    t.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('sender_type', ['team', 'club']).notNullable();
    t.text('content').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('team_club_messages');
};
