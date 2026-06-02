const db = require('../../db');

async function create(data) {
  const [row] = await db('session_requests').insert(data).returning('*');
  return row;
}

async function findBySessionAndPlayer(sessionId, playerId) {
  return db('session_requests')
    .where({ session_id: sessionId, player_id: playerId })
    .whereNull('deleted_at')
    .first();
}

async function getBySession(sessionId) {
  const rows = await db('session_requests')
    .join('users', 'session_requests.player_id', 'users.id')
    .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
    .where('session_requests.session_id', sessionId)
    .whereNull('session_requests.deleted_at')
    .orderBy('session_requests.created_at', 'asc')
    .select(
      'session_requests.*',
      'users.email      as player_email',
      'users.first_name as player_first_name',
      'users.last_name  as player_last_name',
      'users.username   as player_username',
      'player_profiles.level as player_level',
      'player_profiles.style as player_style',
      'player_profiles.strengths as player_strengths',
      'player_profiles.photo_url as player_photo_url',
    );
  return rows.map((row) => ({
    ...row,
    player_strengths: typeof row.player_strengths === 'string'
      ? JSON.parse(row.player_strengths)
      : (row.player_strengths ?? []),
  }));
}

async function getAcceptedBySession(sessionId) {
  return db('session_requests')
    .where({ session_id: sessionId, status: 'accepted' })
    .whereNull('deleted_at')
    .select();
}

async function getById(requestId) {
  return db('session_requests')
    .where({ id: requestId })
    .whereNull('deleted_at')
    .first();
}

async function updateStatus(requestId, status) {
  const [row] = await db('session_requests')
    .where({ id: requestId })
    .update({ status, updated_at: new Date() })
    .returning('*');
  return row;
}

async function getSessionIdsByPlayer(playerId) {
  const rows = await db('session_requests')
    .where({ player_id: playerId })
    .whereIn('status', ['pending', 'accepted'])
    .whereNull('deleted_at')
    .select('session_id');
  return rows.map((r) => r.session_id);
}

/** Returns [{ session_id, status }] for all non-deleted requests by this player. */
async function getRequestsByPlayer(playerId) {
  const rows = await db('session_requests')
    .where({ player_id: playerId })
    .whereNull('deleted_at')
    .select('session_id', 'status');
  return rows;
}

async function softDeleteByPlayerAndSession(playerId, sessionId) {
  const [row] = await db('session_requests')
    .where({ player_id: playerId, session_id: sessionId, status: 'accepted' })
    .update({ status: 'refused', deleted_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

module.exports = {
  create,
  findBySessionAndPlayer,
  getBySession,
  getAcceptedBySession,
  getById,
  updateStatus,
  getSessionIdsByPlayer,
  getRequestsByPlayer,
  softDeleteByPlayerAndSession,
};
