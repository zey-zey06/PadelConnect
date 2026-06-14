exports.up = function (knex) {
  return knex.schema.createTable('tournament_registrations', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.uuid('player1_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('player2_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('payment_method', 30).defaultTo('on_arrival');
    table.string('payment_status', 20).defaultTo('pending'); // pending | paid
    table.timestamp('registered_at').defaultTo(knex.fn.now());
    table.unique(['tournament_id', 'player1_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tournament_registrations');
};
