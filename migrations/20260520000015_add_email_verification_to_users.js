exports.up = async (knex) => {
  await knex.schema.table('users', (t) => {
    t.boolean('email_verified').defaultTo(false).notNullable();
    t.string('email_verification_token', 255).nullable();
    t.timestamp('email_verification_expires_at').nullable();
  });
  // Existing users are pre-verified (they signed up before this feature)
  await knex('users').update({ email_verified: true });
};

exports.down = async (knex) => {
  await knex.schema.table('users', (t) => {
    t.dropColumn('email_verified');
    t.dropColumn('email_verification_token');
    t.dropColumn('email_verification_expires_at');
  });
};
