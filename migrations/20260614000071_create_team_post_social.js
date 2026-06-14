exports.up = async (knex) => {
  await knex.schema.createTable('team_post_likes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('team_posts').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['post_id', 'user_id']);
  });

  await knex.schema.createTable('team_post_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('team_posts').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('team_post_comments');
  await knex.schema.dropTableIfExists('team_post_likes');
};
