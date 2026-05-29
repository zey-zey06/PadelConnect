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

async function getRecentActivity() {
  const [recentUsers, recentBookings] = await Promise.all([
    db('users')
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(5)
      .select(['id', 'email', 'first_name', 'last_name', 'role', 'created_at']),
    db('bookings')
      .join('sessions', 'bookings.session_id', 'sessions.id')
      .join('users', 'sessions.creator_id', 'users.id')
      .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
      .join('venues', 'venue_slots.venue_id', 'venues.id')
      .join('organizations', 'venues.organization_id', 'organizations.id')
      .whereNull('bookings.deleted_at')
      .orderBy('bookings.created_at', 'desc')
      .limit(5)
      .select([
        'bookings.id',
        'bookings.created_at',
        'bookings.status',
        'users.email as player_email',
        'organizations.name as club_name',
        'venues.name as venue_name',
      ]),
  ]);
  return { recentUsers, recentBookings };
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
  return query.select(['users.*', 'player_profiles.phone_number', 'player_profiles.motivation_answer']);
}

async function getSuperAdmins() {
  return db('users')
    .where({ role: 'super_admin' })
    .whereNull('deleted_at')
    .select('id', 'email', 'first_name', 'last_name');
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
  let query = db('sessions')
    .join('users', 'sessions.creator_id', 'users.id')
    .whereNull('sessions.deleted_at')
    .orderBy('sessions.date', 'desc')
    .orderBy('sessions.time', 'desc');
  if (filters.status) query = query.where('sessions.status', filters.status);
  return query.select([
    'sessions.*',
    'users.email as creator_email',
  ]);
}

async function deleteSession(id) {
  const [row] = await db('sessions')
    .where({ id })
    .update({ deleted_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

async function listClubs() {
  return db('organizations')
    .leftJoin('venues', function () {
      this.on('venues.organization_id', '=', 'organizations.id')
        .andOnNull('venues.deleted_at');
    })
    .whereNull('organizations.deleted_at')
    .groupBy('organizations.id')
    .orderBy('organizations.name', 'asc')
    .select([
      'organizations.*',
      db.raw('COUNT(DISTINCT venues.id)::int as venues_count'),
      db.raw(`(
        SELECT email FROM users
        WHERE users.organization_id = organizations.id
          AND users.role = 'venue_admin'
          AND users.deleted_at IS NULL
        LIMIT 1
      ) AS manager_email`),
    ]);
}

async function getClubById(id) {
  return db('organizations').where({ id }).whereNull('deleted_at').first();
}

async function getClubManager(orgId) {
  return db('users')
    .where({ organization_id: orgId, role: 'venue_admin' })
    .whereNull('deleted_at')
    .select('id', 'email', 'first_name', 'last_name')
    .first();
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

// ── Bookings ──────────────────────────────────────────────────────────────────

async function listBookings(filters = {}) {
  let query = db('bookings')
    .join('sessions', 'bookings.session_id', 'sessions.id')
    .join('users', 'sessions.creator_id', 'users.id')
    .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
    .join('venues', 'venue_slots.venue_id', 'venues.id')
    .join('organizations', 'venues.organization_id', 'organizations.id')
    .whereNull('bookings.deleted_at')
    .orderBy('venue_slots.date', 'desc')
    .orderBy('venue_slots.start_time', 'desc');

  if (filters.date) {
    query = query.where('venue_slots.date', filters.date);
  }

  return query.select([
    'bookings.id',
    'bookings.status',
    'bookings.payment_method',
    'bookings.created_at',
    'users.id as player_id',
    'users.email as player_email',
    'organizations.id as club_id',
    'organizations.name as club_name',
    'venues.id as venue_id',
    'venues.name as venue_name',
    'venue_slots.date as slot_date',
    'venue_slots.start_time',
    'venue_slots.end_time',
    'venue_slots.price',
  ]);
}

// ── Sanctions ─────────────────────────────────────────────────────────────────

async function listSanctions(filters = {}) {
  let query = db('penalties')
    .join('users', 'penalties.user_id', 'users.id')
    .leftJoin('organizations', 'penalties.organization_id', 'organizations.id')
    .whereNull('penalties.deleted_at')
    .orderBy('penalties.created_at', 'desc');

  if (filters.type)  query = query.where('penalties.type', filters.type);
  if (filters.paid !== undefined) query = query.where('penalties.paid', filters.paid);

  return query.select([
    'penalties.*',
    'users.email      as user_email',
    'users.first_name as user_first_name',
    'users.last_name  as user_last_name',
    'organizations.name as club_name',
  ]);
}

async function markPenaltyPaid(id) {
  const [row] = await db('penalties')
    .where({ id })
    .update({ paid: true, updated_at: new Date() })
    .returning('*');
  return row;
}

async function deletePenalty(id) {
  const [row] = await db('penalties')
    .where({ id })
    .update({ deleted_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

module.exports = {
  getDashboardStats,
  getRecentActivity,
  listUsers,
  getUserById,
  getSuperAdmins,
  updateUserStatus,
  cancelActiveSessionsForUser,
  listSessions,
  deleteSession,
  listClubs,
  getClubById,
  getClubManager,
  updateClubStatus,
  cancelAvailableSlotsForClub,
  listBookings,
  listSanctions,
  markPenaltyPaid,
  deletePenalty,
};
