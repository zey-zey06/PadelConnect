const db = require('../../db');

async function listAvailable(filters = {}) {
  let query = db('coach_profiles').whereNull('deleted_at');

  if (filters.clubId) {
    query = query.where(function () {
      this.where('is_independent', true).orWhere('organization_id', filters.clubId);
    });
  } else {
    query = query.where('is_independent', true);
  }

  return query.select();
}

async function getById(id) {
  return db('coach_profiles').where({ id }).whereNull('deleted_at').first();
}

async function updateAvailability(id, availability) {
  const [row] = await db('coach_profiles')
    .where({ id })
    .update({ availability: JSON.stringify(availability), updated_at: new Date() })
    .returning('*');
  return row;
}

async function getByOrg(organizationId) {
  return db('coach_profiles')
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select();
}

async function getCoachUser(userId) {
  return db('users').where({ id: userId, role: 'coach' }).whereNull('deleted_at').first();
}

async function attachToClub(userId, organizationId) {
  const [row] = await db('coach_profiles')
    .where({ user_id: userId })
    .update({ organization_id: organizationId, is_independent: false, updated_at: new Date() })
    .returning('*');
  return row;
}

async function getByUserId(userId) {
  return db('coach_profiles').where({ user_id: userId }).whereNull('deleted_at').first();
}

async function getSessionsByCoach(coachProfileId) {
  return db('sessions')
    .join('bookings', 'sessions.id', 'bookings.session_id')
    .join('booking_addons', 'bookings.id', 'booking_addons.booking_id')
    .join('coach_profiles', 'booking_addons.user_id', 'coach_profiles.user_id')
    .where('coach_profiles.id', coachProfileId)
    .where('booking_addons.type', 'coach')
    .whereNull('bookings.deleted_at')
    .whereNull('sessions.deleted_at')
    .orderBy('sessions.date', 'desc')
    .select('sessions.*');
}

module.exports = { listAvailable, getById, getByUserId, updateAvailability, getByOrg, getCoachUser, attachToClub, getSessionsByCoach };
