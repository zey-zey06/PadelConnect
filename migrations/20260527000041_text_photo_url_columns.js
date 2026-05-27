/**
 * Migration 041 — Widen photo/logo/cover columns from VARCHAR(255) to TEXT
 * so that base64 data-URLs (which can exceed 255 chars) are stored without truncation.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('player_profiles', (t) => {
    t.text('photo_url').alter();
  });
  await knex.schema.alterTable('organizations', (t) => {
    t.text('logo_url').alter();
    t.text('cover_url').alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('player_profiles', (t) => {
    t.string('photo_url').alter();
  });
  await knex.schema.alterTable('organizations', (t) => {
    t.string('logo_url').alter();
    t.string('cover_url').alter();
  });
};
