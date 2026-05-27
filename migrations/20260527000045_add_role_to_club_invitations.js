/**
 * Migration 045 — Add role column to club_invitations so the same table
 * can handle both coach invitations (role='coach') and ball-picker invitations
 * (role='ball_picker').  Existing rows default to 'coach'.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('club_invitations', (t) => {
    t.string('role', 20).notNullable().defaultTo('coach');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('club_invitations', (t) => {
    t.dropColumn('role');
  });
};
