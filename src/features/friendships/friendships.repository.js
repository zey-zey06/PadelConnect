const db = require('../../db');

/**
 * Send a friend request.
 * If a previous refused request exists (in either direction), reset it to pending.
 */
async function sendRequest(requesterId, addresseeId) {
  const existing = await db('friendships')
    .where(function () {
      this.where({ requester_id: requesterId, addressee_id: addresseeId })
          .orWhere({ requester_id: addresseeId, addressee_id: requesterId });
    })
    .first();

  if (existing) {
    if (existing.status === 'accepted') {
      const err = new Error('Vous êtes déjà amis.');
      err.status = 409;
      throw err;
    }
    if (existing.status === 'pending') {
      const err = new Error('Une demande d\'ami est déjà en attente.');
      err.status = 409;
      throw err;
    }
    // 'refused' — allow re-request by resetting direction
    const [row] = await db('friendships')
      .where({ id: existing.id })
      .update({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status:       'pending',
        updated_at:   new Date(),
      })
      .returning('*');
    return row;
  }

  const [row] = await db('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
    .returning('*');
  return row;
}

/**
 * Accept a pending request where currentUserId is the addressee.
 */
async function accept(requesterId, addresseeId) {
  const [row] = await db('friendships')
    .where({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .update({ status: 'accepted', updated_at: new Date() })
    .returning('*');
  return row || null;
}

/**
 * Refuse a pending request where currentUserId is the addressee.
 */
async function refuse(requesterId, addresseeId) {
  const [row] = await db('friendships')
    .where({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .update({ status: 'refused', updated_at: new Date() })
    .returning('*');
  return row || null;
}

/**
 * Remove an accepted friendship (unfriend).
 */
async function remove(userId, otherUserId) {
  await db('friendships')
    .where(function () {
      this.where({ requester_id: userId, addressee_id: otherUserId })
          .orWhere({ requester_id: otherUserId, addressee_id: userId });
    })
    .where('status', 'accepted')
    .delete();
}

/**
 * Get friendship status between two users.
 * Returns: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
 */
async function getStatus(userId, otherUserId) {
  const row = await db('friendships')
    .where(function () {
      this.where({ requester_id: userId, addressee_id: otherUserId })
          .orWhere({ requester_id: otherUserId, addressee_id: userId });
    })
    .first();

  if (!row || row.status === 'refused') return { status: 'none' };
  if (row.status === 'accepted') return { status: 'accepted' };
  // pending
  if (row.requester_id === userId) return { status: 'pending_sent' };
  return { status: 'pending_received', friendship_id: row.id };
}

/**
 * Get all accepted friends of a user with their profile info.
 */
async function getFriends(userId) {
  const rows = await db.raw(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.username,
       pp.photo_url,
       pp.level
     FROM friendships f
     JOIN users u ON (
       CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END = u.id
     )
     LEFT JOIN player_profiles pp ON pp.user_id = u.id AND pp.deleted_at IS NULL
     WHERE (f.requester_id = ? OR f.addressee_id = ?)
       AND f.status = 'accepted'
       AND u.deleted_at IS NULL
     ORDER BY u.first_name, u.last_name`,
    [userId, userId, userId],
  );
  return rows.rows;
}

/**
 * Get pending friend requests sent TO the given user (they are the addressee).
 */
async function getPendingRequests(userId) {
  return db('friendships')
    .join('users', 'friendships.requester_id', 'users.id')
    .leftJoin('player_profiles', 'player_profiles.user_id', 'users.id')
    .where({ 'friendships.addressee_id': userId, 'friendships.status': 'pending' })
    .whereNull('users.deleted_at')
    .orderBy('friendships.created_at', 'desc')
    .select(
      'friendships.id         as friendship_id',
      'friendships.created_at as requested_at',
      'users.id               as user_id',
      'users.first_name',
      'users.last_name',
      'users.username',
      'player_profiles.photo_url',
      'player_profiles.level',
    );
}

module.exports = {
  sendRequest,
  accept,
  refuse,
  remove,
  getStatus,
  getFriends,
  getPendingRequests,
};
