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
    .select([
      'player_profiles.*',
      'users.email    as user_email',
      'users.first_name as user_first_name',
      'users.last_name  as user_last_name',
      'users.username   as user_username',
    ])
    .first();
  return deserialize(row);
}

/**
 * Minimal user info when no player_profile exists yet.
 */
async function getUserBasicInfo(userId) {
  const user = await db('users')
    .where({ id: userId })
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'username', 'email')
    .first();
  if (!user) return null;
  return {
    user_id: userId,
    user_first_name: user.first_name,
    user_last_name:  user.last_name,
    user_username:   user.username,
    user_email:      user.email,
  };
}

/**
 * Sessions created by the user + accepted friendships count.
 * Used to populate the stats row on the Instagram-style profile.
 */
async function getCountsByUserId(userId) {
  const [sessionsRow, friendsRow] = await Promise.all([
    db('sessions')
      .where({ creator_id: userId })
      .whereNull('deleted_at')
      .count('id as count')
      .first(),
    db('friendships')
      .where(function () {
        this.where({ requester_id: userId }).orWhere({ addressee_id: userId });
      })
      .where('status', 'accepted')
      .count('id as count')
      .first(),
  ]);
  return {
    sessions_count: parseInt(sessionsRow?.count ?? 0, 10),
    friends_count:  parseInt(friendsRow?.count  ?? 0, 10),
  };
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
    'users.username       as user_username',
  );
  return rows.map(deserialize);
}

/**
 * Find players with a similar level (±1) to the given user.
 * Excludes the target user. Limit 5.
 */
async function getSimilarPlayers(userId, level) {
  const rows = await db('player_profiles')
    .join('users', 'player_profiles.user_id', 'users.id')
    .whereNull('player_profiles.deleted_at')
    .whereNull('users.deleted_at')
    .whereNot('player_profiles.user_id', userId)
    .whereBetween('player_profiles.level', [Math.max(1, level - 1), Math.min(7, level + 1)])
    .orderByRaw('RANDOM()')
    .limit(5)
    .select(
      'player_profiles.user_id as id',
      'player_profiles.level',
      'player_profiles.photo_url',
      'users.first_name',
      'users.last_name',
      'users.username',
    );
  return rows;
}

module.exports = { getByUserId, getUserBasicInfo, getCountsByUserId, upsert, getEligibleForSession, getSimilarPlayers };
