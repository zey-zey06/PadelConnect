exports.up = (knex) =>
  knex.schema.table('player_profiles', (t) => {
    t.integer('xp_points').notNullable().defaultTo(0);
  });

exports.down = (knex) =>
  knex.schema.table('player_profiles', (t) => {
    t.dropColumn('xp_points');
  });
