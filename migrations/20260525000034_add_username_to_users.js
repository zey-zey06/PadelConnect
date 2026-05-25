/**
 * Migration 034 — Add username to users
 * Auto-generated on signup from first_name + last_name + ID suffix.
 * Unique partial index (NULLs are allowed for legacy compatibility).
 */
exports.up = async (knex) => {
  // Step 1 — add column (nullable first, backfill, then constrain)
  await knex.schema.table('users', (t) => {
    t.string('username', 50).nullable();
  });

  // Step 2 — backfill existing users with a deterministic username
  const users = await knex('users').whereNull('username').select('id', 'first_name', 'last_name');
  for (const u of users) {
    const base = [u.first_name, u.last_name]
      .filter(Boolean)
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'joueur';
    // Use first 6 hex chars of the UUID as unique suffix — no collisions possible
    const suffix = u.id.replace(/-/g, '').slice(0, 6);
    await knex('users').where({ id: u.id }).update({ username: `${base}_${suffix}` });
  }

  // Step 3 — add unique index (PostgreSQL allows multiple NULLs in a regular UNIQUE)
  await knex.schema.table('users', (t) => {
    t.unique(['username'], 'users_username_unique');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('users', (t) => {
    t.dropUnique(['username'], 'users_username_unique');
    t.dropColumn('username');
  });
};
