exports.up = async (knex) => {
  await knex.schema.createTable('team_club_chats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('club_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['team_id', 'club_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('team_club_chats');
};
