exports.up = (knex) =>
  knex.schema.alterTable('organizations', (t) => {
    t.decimal('latitude',  9, 6).nullable();
    t.decimal('longitude', 9, 6).nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('organizations', (t) => {
    t.dropColumn('latitude');
    t.dropColumn('longitude');
  });
