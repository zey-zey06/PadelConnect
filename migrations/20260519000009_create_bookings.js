/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('venue_slot_id').notNullable().unique().references('id').inTable('venue_slots').onDelete('RESTRICT');
    // bookings are confirmed on creation — no manual approval flow
    t.enu('status', ['confirmed', 'cancelled']).notNullable().defaultTo('confirmed');
    t.timestamp('cancelled_at').nullable();
    t.text('cancellation_reason').nullable();
    t.timestamps(true, true);

    t.index('session_id');
    t.index('venue_slot_id');
    t.index('status');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('bookings');
};
