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
    query = query.whereRaw("(sessions.preferences->>'level')::int >= ?", [filters.level_min]);
  }
  if (filters.level_max != null) {
    query = query.whereRaw("(sessions.preferences->>'level')::int <= ?", [filters.level_max]);
  }

  return query.select(
    'sessions.*',
    'users.email as creator_email',
    'player_profiles.photo_url as creator_photo_url',
    'player_profiles.level as creator_level',
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

module.exports = { create, list, listByCreator, getById, updateStatus, updateCurrentPlayers };
