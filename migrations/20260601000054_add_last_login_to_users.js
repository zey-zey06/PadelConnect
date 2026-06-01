exports.up = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.timestamp('last_login').nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.dropColumn('last_login');
  });
