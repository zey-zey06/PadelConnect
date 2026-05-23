const db = require('../../db');

function serialize(data) {
  const out = { ...data };
  if (Array.isArray(out.strengths))  out.strengths  = JSON.stringify(out.strengths);
  if (Array.isArray(out.weaknesses)) out.weaknesses = JSON.stringify(out.weaknesses);
  return out;
}

function deserialize(row) {
  if (!row) return row;
  const out = { ...row };
  if (typeof out.strengths  === 'string') out.strengths  = JSON.parse(out.strengths);
  if (typeof out.weaknesses === 'string') out.weaknesses = JSON.parse(out.weaknesses);
  return out;
}

async function getByUserId(userId) {
  const row = await db('player_profiles')
    .leftJoin('users', 'player_profiles.user_id', 'users.id')
    .where({ 'player_profiles.user_id': userId })
    .whereNull('player_profiles.deleted_at')
    .select(['player_profiles.*', 'users.email as user_email', 'users.first_name as user_first_name', 'users.last_name as user_last_name'])
    .first();
  return deserialize(row);
}

async function upsert(userId, data) {
  const payload  = serialize(data);
  const existing = await db('player_profiles')
    .where({ user_id: userId })
    .whereNull('deleted_at')
    .first();

  if (existing) {
    const [row] = await db('player_profiles')
      .where({ user_id: userId })
      .update({ ...payload, updated_at: new Date() })
      .returning('*');
    return deserialize(row);
  }

  const [row] = await db('player_profiles')
    .insert({ user_id: userId, ...payload })
    .returning('*');
  return deserialize(row);
}

/**
 * Return all player profiles excluding the given user IDs.
 * Used by the AI find-matches endpoint to get eligible candidates.
 */
async function getEligibleForSession(excludeUserIds = []) {
  let query = db('player_profiles')
    .join('users', 'player_profiles.user_id', 'users.id')
    .whereNull('player_profiles.deleted_at');

  if (excludeUserIds.length) {
    query = query.whereNotIn('player_profiles.user_id', excludeUserIds);
  }

  const rows = await query.select(
    'player_profiles.*',
    'users.email          as user_email',
    'users.first_name     as user_first_name',
    'users.last_name      as user_last_name',
  );
  return rows.map(deserialize);
}

module.exports = { getByUserId, upsert, getEligibleForSession };
