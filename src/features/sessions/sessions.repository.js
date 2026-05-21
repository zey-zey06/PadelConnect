const db = require('../../db');

async function create(data) {
  const [row] = await db('sessions').insert(data).returning('*');
  return row;
}

async function list(filters = {}) {
  let query = db('sessions')
    .whereNull('deleted_at')
    .orderBy('date', 'asc')
    .orderBy('time', 'asc');

  if (filters.date) {
    query = query.where('date', filters.date);
  }
  if (filters.status) {
    query = query.where('status', filters.status);
  }
  if (filters.level_min != null) {
    query = query.whereRaw("(preferences->>'level')::int >= ?", [filters.level_min]);
  }
  if (filters.level_max != null) {
    query = query.whereRaw("(preferences->>'level')::int <= ?", [filters.level_max]);
  }

  return query.select();
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
