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

module.exports = { listAvailable, getById, updateAvailability, getByOrg, getCoachUser, attachToClub };
