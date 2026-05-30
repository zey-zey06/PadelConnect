exports.up = (knex) =>
  knex.schema.table('users', (t) => {
    t.string('password_reset_token').nullable();
    t.timestamp('password_reset_expires_at').nullable();
  });

exports.down = (knex) =>
  knex.schema.table('users', (t) => {
    t.dropColumn('password_reset_token');
    t.dropColumn('password_reset_expires_at');
  });
