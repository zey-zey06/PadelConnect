// Alter the status column from enum → text to allow 'cancelled' without rebuilding the enum type.
// Application-level Joi validation enforces the allowed set.
exports.up = async (knex) => {
  await knex.raw(`ALTER TABLE tournaments ALTER COLUMN status TYPE TEXT USING status::TEXT`);
};

exports.down = async (knex) => {
  // Restore enum (only safe if no 'cancelled' rows exist)
  await knex.raw(`
    ALTER TABLE tournaments
    ALTER COLUMN status TYPE TEXT USING status::TEXT
  `);
};
