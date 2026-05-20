const db = require('../../db');

async function create(data) {
  const [row] = await db('bookings').insert(data).returning('*');
  return row;
}

async function createAddon(data) {
  const [row] = await db('booking_addons').insert(data).returning('*');
  return row;
}

async function getById(id) {
  return db('bookings').where({ id }).whereNull('deleted_at').first();
}

async function getByUser(userId) {
  return db('bookings')
    .join('sessions', 'bookings.session_id', 'sessions.id')
    .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
    .join('venues', 'venue_slots.venue_id', 'venues.id')
    .where('sessions.creator_id', userId)
    .whereNull('bookings.deleted_at')
    .orderBy('sessions.date', 'desc')
    .select(
      'bookings.*',
      'sessions.date as session_date',
      'sessions.time as session_time',
      'sessions.status as session_status',
      'venue_slots.start_time',
      'venue_slots.end_time',
      'venue_slots.price',
      'venues.name as venue_name'
    );
}

async function cancel(id) {
  const [row] = await db('bookings')
    .where({ id })
    .update({ status: 'cancelled', cancelled_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

async function createNoShowRecord(data) {
  const [row] = await db('no_show_records').insert(data).returning('*');
  return row;
}

module.exports = { create, createAddon, getById, getByUser, cancel, createNoShowRecord };
