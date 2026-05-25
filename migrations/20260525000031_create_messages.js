exports.up = function (knex) {
  return knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('receiver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['sender_id', 'receiver_id']);
    table.index(['receiver_id', 'read']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('messages');
};
