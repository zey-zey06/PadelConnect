exports.up = (knex) =>
  knex.schema.table('player_profiles', (t) => {
    t.boolean('is_available').defaultTo(false).notNullable();
  });

exports.down = (knex) =>
  knex.schema.table('player_profiles', (t) => {
    t.dropColumn('is_available');
  });
