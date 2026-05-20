const db = require('../../db');

async function getByUserId(userId) {
  return db('player_profiles').where({ user_id: userId }).whereNull('deleted_at').first();
}

async function upsert(userId, data) {
  const existing = await db('player_profiles')
    .where({ user_id: userId })
    .whereNull('deleted_at')
    .first();

  if (existing) {
    const [row] = await db('player_profiles')
      .where({ user_id: userId })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return row;
  }

  const [row] = await db('player_profiles')
    .insert({ user_id: userId, ...data })
    .returning('*');
  return row;
}

module.exports = { getByUserId, upsert };
