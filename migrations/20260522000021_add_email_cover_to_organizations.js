exports.up = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.string('email').nullable();
    table.string('cover_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('organizations', (table) => {
    table.dropColumns('email', 'cover_url');
  });
};
