/**
 * Migration 035 — Add bio and cover_photo_url to player_profiles
 * bio: short text shown under name on the Instagram-style profile (max 150 chars)
 * cover_photo_url: banner photo stored as base64 data-URL (same pattern as photo_url)
 */
exports.up = async (knex) => {
  await knex.schema.table('player_profiles', (t) => {
    t.string('bio', 150).nullable();
    t.text('cover_photo_url').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('player_profiles', (t) => {
    t.dropColumn('bio');
    t.dropColumn('cover_photo_url');
  });
};
