/**
 * Add actor_id to notifications so friend_request notifications carry
 * the requester's user ID — enabling inline Accept / Refuse in the UI.
 */
exports.up = function (knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.dropColumn('actor_id');
  });
};
