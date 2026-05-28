const db = require('../../db');

async function createVenue(data) {
  const [row] = await db('venues').insert(data).returning('*');
  return row;
}

async function getByOrg(organizationId) {
  return db('venues')
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')
    .orderBy('name', 'asc')
    .select();
}

async function getById(id) {
  return db('venues').where({ id }).whereNull('deleted_at').first();
}

async function createSlot(data) {
  const [row] = await db('venue_slots').insert(data).returning('*');
  return row;
}

async function getSlots(venueId, filters = {}) {
  let query = db('venue_slots')
    .leftJoin('bookings', function () {
      this.on('bookings.venue_slot_id', '=', 'venue_slots.id')
        .andOnVal('bookings.status', '=', 'confirmed')
        .andOnNull('bookings.deleted_at');
    })
    .leftJoin('sessions', 'sessions.id', 'bookings.session_id')
    .leftJoin('users', 'users.id', 'sessions.creator_id')
    .leftJoin('player_profiles', function () {
      this.on('player_profiles.user_id', '=', 'users.id')
        .andOnNull('player_profiles.deleted_at');
    })
    .where({ 'venue_slots.venue_id': venueId })
    .whereNull('venue_slots.deleted_at')
    .orderBy('venue_slots.date', 'asc')
    .orderBy('venue_slots.start_time', 'asc');

  if (filters.date) {
    query = query.where('venue_slots.date', filters.date);
  }

  return query.select([
    'venue_slots.*',
    'users.id as booked_by_id',
    'users.email as booked_by_email',
    'users.first_name as booked_by_first_name',
    'users.last_name as booked_by_last_name',
    'player_profiles.phone_number as booked_by_phone',
  ]);
}

async function getSlotById(id) {
  return db('venue_slots').where({ id }).whereNull('deleted_at').first();
}

async function updateSlot(id, data) {
  const [row] = await db('venue_slots')
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

async function softDeleteSlot(id) {
  const [row] = await db('venue_slots')
    .where({ id })
    .update({ status: 'cancelled', deleted_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

async function getActiveBookingForSlot(slotId) {
  return db('bookings')
    .where({ venue_slot_id: slotId, status: 'confirmed' })
    .whereNull('deleted_at')
    .first();
}

async function cancelBooking(bookingId) {
  const [row] = await db('bookings')
    .where({ id: bookingId })
    .update({ status: 'cancelled', updated_at: new Date() })
    .returning('*');
  return row;
}

async function bulkCreateSlots(rows) {
  return db.batchInsert('venue_slots', rows, 200);
}

async function getAllVenues() {
  return db('venues').whereNull('deleted_at').select();
}

// Returns existing (venue_id, date, start_time) tuples — includes cancelled/soft-deleted
// rows so fillMissingSlots never re-inserts an intentionally cancelled slot.
async function getSlotsByVenuesAndDates(venueIds, fromDate, toDate) {
  return db('venue_slots')
    .whereIn('venue_id', venueIds)
    .where('date', '>=', fromDate)
    .where('date', '<=', toDate)
    .select('venue_id', 'date', 'start_time');
}

// Returns all slots (including soft-deleted cancelled ones) for display purposes.
async function getSlotsByVenueIds(venueIds, date) {
  return db('venue_slots')
    .whereIn('venue_id', venueIds)
    .where('date', date)
    .orderBy('start_time', 'asc')
    .select();
}

async function bulkUpdateSlotPrice(venueId, startTime, endTime, price) {
  return db('venue_slots')
    .where({ venue_id: venueId, start_time: startTime, end_time: endTime })
    .whereNull('deleted_at')
    .whereIn('status', ['available', 'booked'])
    .update({ price, updated_at: new Date() });
}

async function softDeleteVenue(id) {
  const [row] = await db('venues')
    .where({ id })
    .update({ deleted_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

module.exports = {
  createVenue,
  getAllVenues,
  getByOrg,
  getById,
  createSlot,
  bulkCreateSlots,
  getSlots,
  getSlotsByVenuesAndDates,
  getSlotsByVenueIds,
  getSlotById,
  updateSlot,
  softDeleteSlot,
  softDeleteVenue,
  getActiveBookingForSlot,
  cancelBooking,
  bulkUpdateSlotPrice,
};
