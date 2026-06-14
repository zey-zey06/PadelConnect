exports.up = function (knex) {
  return knex.schema.createTable('tournament_matches', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.uuid('team1_player1').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('team1_player2').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('team2_player1').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('team2_player2').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('score_team1').nullable();
    table.integer('score_team2').nullable();
    table.integer('winner_team').nullable(); // 1 or 2
    table.integer('round').defaultTo(1);
    table.integer('group_number').nullable(); // for round_robin groups
    table.timestamp('match_date').nullable();
    table.string('status', 20).defaultTo('scheduled'); // scheduled | in_progress | completed
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tournament_matches');
};
