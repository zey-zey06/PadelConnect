exports.up = function (knex) {
  return knex.schema.createTable('teams', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('logo_url');
    table.text('description');
    table.string('city', 100).defaultTo('Abidjan');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('teams');
};
