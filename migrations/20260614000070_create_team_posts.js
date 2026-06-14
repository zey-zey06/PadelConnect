exports.up = async (knex) => {
  await knex.schema.createTable('team_posts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('type', ['photo', 'reel']).notNullable();
    t.text('media_url').notNullable();
    t.text('caption').nullable();
    t.integer('likes_count').defaultTo(0);
    t.integer('comments_count').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('team_posts');
};
