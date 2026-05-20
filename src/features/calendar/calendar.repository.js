const db = require('../../db');

/**
 * Return all upcoming (today or later) bookings for a user, enriched
 * with session, slot, and venue data — ordered chronologically.
 */
async function getUpcomingForUser(userId) {
  const today = new Date().toISOString().slice(0, 10);

  return db('sessions')
    .join('bookings',    'sessions.id',          'bookings.session_id')
    .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
    .join('venues',      'venue_slots.venue_id',   'venues.id')
    .where('sessions.creator_id', userId)
    .where('sessions.date', '>=', today)
    .whereNull('bookings.deleted_at')
    .whereNull('sessions.deleted_at')
    .orderBy('sessions.date', 'asc')
    .orderBy('sessions.time', 'asc')
    .select(
      'sessions.id as session_id',
      'sessions.date',
      'sessions.time',
      'sessions.status as session_status',
      'sessions.current_players',
      'sessions.max_players',
      'bookings.id as booking_id',
      'bookings.status as booking_status',
      'venue_slots.start_time',
      'venue_slots.end_time',
      'venue_slots.price',
      'venues.id as venue_id',
      'venues.name as venue_name',
      'venues.description as venue_description'
    );
}

module.exports = { getUpcomingForUser };
