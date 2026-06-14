exports.up = function (knex) {
  return knex.schema.createTable('tournaments', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').references('id').inTable('teams').onDelete('SET NULL');
    table.uuid('club_id').references('id').inTable('organizations').onDelete('SET NULL');
    table.string('name', 150).notNullable();
    table.text('description');
    table.string('format', 20).defaultTo('elimination'); // elimination | round_robin
    table.integer('level_min').defaultTo(1);
    table.integer('level_max').defaultTo(7);
    table.integer('max_teams').defaultTo(16);
    table.decimal('registration_fee', 10, 2).defaultTo(0);
    table.date('start_date');
    table.date('end_date');
    table.string('status', 20).defaultTo('draft'); // draft | open | ongoing | completed
    table.text('banner_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tournaments');
};
