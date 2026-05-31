exports.up = (knex) =>
  knex.schema.table('organizations', (t) => {
    t.jsonb('opening_hours').nullable();
  });

exports.down = (knex) =>
  knex.schema.table('organizations', (t) => {
    t.dropColumn('opening_hours');
  });
