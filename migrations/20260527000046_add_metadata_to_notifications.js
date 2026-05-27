exports.up = function (knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.jsonb('metadata').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.dropColumn('metadata');
  });
};
