exports.up = (knex) =>
  knex.schema.alterTable('sessions', (t) => {
    t.string('location', 200).nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('sessions', (t) => {
    t.dropColumn('location');
  });
