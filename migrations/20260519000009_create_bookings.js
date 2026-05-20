/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('bookings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    table.uuid('venue_slot_id').notNullable().references('id').inTable('venue_slots').onDelete('RESTRICT');
    table.string('status').notNullable().defaultTo('confirmed');
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('bookings');
};
