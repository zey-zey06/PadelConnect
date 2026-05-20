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
  return db('session_requests')
    .where({ session_id: sessionId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select();
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

module.exports = {
  create,
  findBySessionAndPlayer,
  getBySession,
  getAcceptedBySession,
  getById,
  updateStatus,
};
