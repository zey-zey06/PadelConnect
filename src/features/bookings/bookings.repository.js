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
    .join('organizations', 'venues.organization_id', 'organizations.id')
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
      'venues.name as venue_name',
      'organizations.name as club_name',
      'organizations.id as club_id',
      db.raw(
        `venue_slots.price + COALESCE(
          (SELECT SUM(ba.price) FROM booking_addons ba WHERE ba.booking_id = bookings.id),
          0
        ) AS total_price`
      ),
    );
}

async function getActiveBookingBySession(sessionId) {
  return db('bookings')
    .where({ session_id: sessionId })
    .whereNot({ status: 'cancelled' })
    .whereNull('deleted_at')
    .first();
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

module.exports = { create, createAddon, getById, getByUser, cancel, createNoShowRecord, getActiveBookingBySession };
