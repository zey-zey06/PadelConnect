exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('team_id');
  });
};
