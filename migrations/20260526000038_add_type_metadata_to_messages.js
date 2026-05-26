exports.up = function (knex) {
  return knex.schema.alterTable('messages', (table) => {
    table.string('type', 20).notNullable().defaultTo('text');
    table.jsonb('metadata').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('messages', (table) => {
    table.dropColumn('type');
    table.dropColumn('metadata');
  });
};
