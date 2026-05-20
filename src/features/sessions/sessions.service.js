const sessionsRepo = require('./sessions.repository');

async function create(userId, data) {
  return sessionsRepo.create({
    creator_id: userId,
    date: data.date,
    time: data.time,
    max_players: data.max_players,
    preferences: data.preferences || null,
  });
}

async function list(filters) {
  return sessionsRepo.list(filters);
}

async function getById(sessionId) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  return session;
}

async function updateStatus(sessionId, userId, status) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  if (session.creator_id !== userId) {
    const err = new Error('Accès refusé. Seul le créateur peut modifier le statut.');
    err.status = 403;
    throw err;
  }
  return sessionsRepo.updateStatus(sessionId, status);
}

module.exports = { create, list, getById, updateStatus };
