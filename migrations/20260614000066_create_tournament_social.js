exports.up = function (knex) {
  return knex.schema
    .createTable('tournament_likes', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tournament_id', 'user_id']);
    })
    .createTable('tournament_comments', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('body').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('tournament_comments')
    .dropTableIfExists('tournament_likes');
};
