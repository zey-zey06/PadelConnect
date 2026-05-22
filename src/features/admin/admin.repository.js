const db = require('../../db');

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const users    = await db('users').whereNull('deleted_at').select('id');
  const sessions = await db('sessions').where({ status: 'open' }).whereNull('deleted_at').select('id');
  const bookings = await db('bookings').whereNull('deleted_at').select('id');
  const clubs    = await db('organizations').whereNull('deleted_at').select('id');

  return {
    total_users: users.length,
    active_sessions: sessions.length,
    total_bookings: bookings.length,
    total_clubs: clubs.length,
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function listUsers(filters = {}) {
  let query = db('users')
    .leftJoin('player_profiles', function () {
      this.on('player_profiles.user_id', '=', 'users.id')
        .andOnNull('player_profiles.deleted_at');
    })
    .whereNull('users.deleted_at')
    .orderBy('users.created_at', 'desc');
  if (filters.status) query = query.where('users.status', filters.status);
  if (filters.role)   query = query.where('users.role', filters.role);
  return query.select(['users.*', 'player_profiles.phone_number']);
}

async function getUserById(id) {
  return db('users').where({ id }).whereNull('deleted_at').first();
}

async function updateUserStatus(id, status) {
  const [row] = await db('users')
    .where({ id })
    .update({ status, updated_at: new Date() })
    .returning('*');
  return row;
}

/**
 * Cancel all open/complete sessions created by a suspended user.
 */
async function cancelActiveSessionsForUser(userId) {
  await db('sessions')
    .where({ creator_id: userId })
    .whereIn('status', ['open', 'complete'])
    .update({ status: 'cancelled', updated_at: new Date() });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function listSessions(filters = {}) {
  let query = db('sessions').whereNull('deleted_at').orderBy('date', 'desc');
  if (filters.status) query = query.where('status', filters.status);
  return query.select();
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

async function listClubs() {
  return db('organizations').whereNull('deleted_at').orderBy('name', 'asc').select();
}

async function getClubById(id) {
  return db('organizations').where({ id }).whereNull('deleted_at').first();
}

async function updateClubStatus(id, status) {
  const [row] = await db('organizations')
    .where({ id })
    .update({ status, updated_at: new Date() })
    .returning('*');
  return row;
}

/**
 * Cancel all available slots belonging to a deactivated club's venues.
 */
async function cancelAvailableSlotsForClub(organizationId) {
  await db('venue_slots')
    .whereIn('venue_id', db('venues').where({ organization_id: organizationId }).select('id'))
    .where({ status: 'available' })
    .update({ status: 'cancelled', updated_at: new Date() });
}

module.exports = {
  getDashboardStats,
  listUsers,
  getUserById,
  updateUserStatus,
  cancelActiveSessionsForUser,
  listSessions,
  listClubs,
  getClubById,
  updateClubStatus,
  cancelAvailableSlotsForClub,
};
