const db = require('../../db');

async function create(data) {
  const [row] = await db('sessions').insert(data).returning('*');
  return row;
}

async function list(filters = {}) {
  let query = db('sessions')
    .join('users', 'sessions.creator_id', 'users.id')
    .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
    .whereNull('sessions.deleted_at')
    .orderBy('sessions.date', 'asc')
    .orderBy('sessions.time', 'asc');

  if (filters.date) {
    query = query.where('sessions.date', filters.date);
  }
  if (filters.status) {
    query = query.where('sessions.status', filters.status);
  }
  if (filters.level_min != null) {
    query = query.whereRaw("(sessions.preferences->>'level_min')::int >= ?", [filters.level_min]);
  }
  if (filters.level_max != null) {
    query = query.whereRaw("(sessions.preferences->>'level_min')::int <= ?", [filters.level_max]);
  }
  if (filters.gender) {
    query = query.whereRaw("sessions.preferences->>'gender' = ?", [filters.gender]);
  }

  return query.select(
    'sessions.*',
    'users.email          as creator_email',
    'users.first_name     as creator_first_name',
    'users.last_name      as creator_last_name',
    'player_profiles.photo_url as creator_photo_url',
    'player_profiles.level     as creator_level',
  );
}

async function getById(id) {
  return db('sessions').where({ id }).whereNull('deleted_at').first();
}

async function updateStatus(id, status) {
  const [row] = await db('sessions')
    .where({ id })
    .update({ status, updated_at: new Date() })
    .returning('*');
  return row;
}

async function updateCurrentPlayers(id, count) {
  const [row] = await db('sessions')
    .where({ id })
    .update({ current_players: count, updated_at: new Date() })
    .returning('*');
  return row;
}

async function listByCreator(userId) {
  return db('sessions')
    .where({ creator_id: userId })
    .whereNull('deleted_at')
    .orderBy('date', 'desc')
    .select();
}

async function getSessionPlayers(sessionId) {
  const session = await db('sessions').where({ id: sessionId }).first();
  if (!session) return [];
  const [creator, accepted] = await Promise.all([
    db('users').where({ id: session.creator_id }).first(),
    db('session_requests')
      .join('users', 'session_requests.player_id', 'users.id')
      .where({ 'session_requests.session_id': sessionId, 'session_requests.status': 'accepted' })
      .whereNull('session_requests.deleted_at')
      .select('users.id', 'users.email', 'users.name'),
  ]);
  const players = [];
  if (creator) players.push({ id: creator.id, email: creator.email, name: creator.name });
  for (const p of accepted) {
    if (!players.some((x) => x.id === p.id)) players.push(p);
  }
  return players;
}

async function getUserById(userId) {
  return db('users').where({ id: userId }).first();
}

async function getMyRequests(userId) {
  return db('session_requests')
    .where({ player_id: userId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc')
    .select();
}

/**
 * Returns all sessions where userId is creator OR has a request (any status),
 * sorted date DESC.  Each row includes request_status and optional booking info.
 */
async function getHistory(userId) {
  const sessions = await db('sessions as s')
    .join('users as u', 's.creator_id', 'u.id')
    .leftJoin('player_profiles as pp', 'pp.user_id', 'u.id')
    .leftJoin('session_requests as sr', function () {
      this.on('sr.session_id', '=', 's.id')
        .andOn('sr.player_id', '=', db.raw('?', [userId]))
        .andOnNull('sr.deleted_at');
    })
    .whereNull('s.deleted_at')
    .where(function () {
      this.where('s.creator_id', userId).orWhereNotNull('sr.id');
    })
    .orderBy('s.date', 'desc')
    .orderBy('s.time', 'desc')
    .select(
      's.id', 's.date', 's.time', 's.end_time',
      's.max_players', 's.current_players', 's.status',
      's.creator_id', 's.preferences', 's.created_at',
      'u.first_name as creator_first_name',
      'u.last_name  as creator_last_name',
      'pp.photo_url as creator_photo_url',
      'pp.level     as creator_level',
      'sr.status    as request_status',
    );

  if (!sessions.length) return [];

  // For sessions the user created, load one active booking to show venue info
  const creatorSessionIds = sessions
    .filter((s) => s.creator_id === userId)
    .map((s) => s.id);

  const bookingMap = {};
  if (creatorSessionIds.length) {
    const bks = await db('bookings as b')
      .join('venue_slots as vs', 'vs.id', 'b.venue_slot_id')
      .join('venues as v', 'v.id', 'vs.venue_id')
      .join('organizations as org', 'org.id', 'v.organization_id')
      .whereIn('b.session_id', creatorSessionIds)
      .whereNull('b.deleted_at')
      .whereNot('b.status', 'cancelled')
      .orderBy('b.created_at', 'asc')
      .select('b.session_id', 'v.name as venue_name', 'org.name as club_name');
    for (const bk of bks) {
      if (!bookingMap[bk.session_id]) {
        bookingMap[bk.session_id] = { venue_name: bk.venue_name, club_name: bk.club_name };
      }
    }
  }

  return sessions.map((s) => ({ ...s, booking: bookingMap[s.id] ?? null }));
}

async function getSessionParticipants(sessionId) {
  const session = await db('sessions').where({ id: sessionId }).whereNull('deleted_at').first();
  if (!session) return [];

  const [creator, accepted] = await Promise.all([
    db('users')
      .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
      .where('users.id', session.creator_id)
      .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'player_profiles.photo_url')
      .first(),
    db('session_requests')
      .join('users', 'session_requests.player_id', 'users.id')
      .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
      .where({ 'session_requests.session_id': sessionId, 'session_requests.status': 'accepted' })
      .whereNull('session_requests.deleted_at')
      .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'player_profiles.photo_url'),
  ]);

  const participants = [];
  if (creator) participants.push({ ...creator, is_creator: true });
  for (const p of accepted) {
    if (!participants.some((x) => x.id === p.id)) participants.push(p);
  }
  return participants;
}

module.exports = { create, list, listByCreator, getById, updateStatus, updateCurrentPlayers, getSessionPlayers, getUserById, getMyRequests, getHistory, getSessionParticipants };
