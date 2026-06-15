const db = require('../../db');

// Team posts from teams the user follows
async function getFollowedTeamPosts(userId, limit = 40) {
  return db('team_posts as p')
    .join('teams as t', 't.id', 'p.team_id')
    .join('team_followers as tf', 'tf.team_id', 'p.team_id')
    .where('tf.user_id', userId)
    .whereNull('p.deleted_at')
    .orderBy('p.created_at', 'desc')
    .limit(limit)
    .select(
      'p.id', 'p.team_id', 'p.type', 'p.media_url', 'p.caption',
      'p.likes_count', 'p.comments_count', 'p.created_at', 'p.metadata',
      't.name as team_name', 't.logo_url as team_logo',
      db.raw("'team_post' as _type"),
    );
}

// Upcoming open sessions created by the user's friends (not by self)
async function getFriendSessions(userId, limit = 40) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return db('sessions as s')
    .join('users as u', 'u.id', 's.creator_id')
    .leftJoin('player_profiles as pp', function () {
      this.on('pp.user_id', '=', 'u.id').andOnNull('pp.deleted_at');
    })
    .joinRaw(
      `JOIN friendships f ON
         (f.requester_id = s.creator_id AND f.addressee_id = ?)
         OR (f.addressee_id = s.creator_id AND f.requester_id = ?)`,
      [userId, userId],
    )
    .where('f.status', 'accepted')
    .where('s.status', 'open')
    .where('s.date', '>=', todayStr)
    .whereNot('s.creator_id', userId)
    .whereNull('s.deleted_at')
    .orderBy('s.created_at', 'desc')
    .limit(limit)
    .select(
      's.id', 's.date', 's.time', 's.end_time', 's.location',
      's.max_players', 's.current_players', 's.status', 's.preferences',
      's.created_at',
      'u.id as creator_id',
      'u.first_name as creator_first_name',
      'u.last_name as creator_last_name',
      'pp.photo_url as creator_photo_url',
      'pp.level as creator_level',
      db.raw("'session' as _type"),
    );
}

// Batch-check which team_post IDs the user has liked
async function getLikedPostIds(userId, postIds) {
  if (!postIds.length) return new Set();
  const rows = await db('team_post_likes')
    .whereIn('post_id', postIds)
    .where('user_id', userId)
    .select('post_id');
  return new Set(rows.map((r) => r.post_id));
}

// Stories: friends with avatars
async function getFriendsForStories(userId) {
  const rows = await db.raw(
    `SELECT u.id, u.first_name, u.last_name, pp.photo_url
     FROM friendships f
     JOIN users u ON (CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END = u.id)
     LEFT JOIN player_profiles pp ON pp.user_id = u.id AND pp.deleted_at IS NULL
     WHERE (f.requester_id = ? OR f.addressee_id = ?)
       AND f.status = 'accepted'
       AND u.deleted_at IS NULL
     ORDER BY u.first_name, u.last_name
     LIMIT 12`,
    [userId, userId, userId],
  );
  return rows.rows;
}

// Stories: teams the user follows
async function getFollowedTeams(userId) {
  return db('team_followers as tf')
    .join('teams as t', 't.id', 'tf.team_id')
    .where('tf.user_id', userId)
    .whereNull('t.deleted_at')
    .orderBy('tf.created_at', 'desc')
    .select('t.id', 't.name', 't.logo_url as logo');
}

// Is the user connected to anyone (follows team OR has friends)?
async function getConnectionCount(userId) {
  const [{ count: friendCount }] = await db('friendships')
    .where(function () { this.where('requester_id', userId).orWhere('addressee_id', userId); })
    .where('status', 'accepted')
    .count('id as count');
  const [{ count: followCount }] = await db('team_followers')
    .where('user_id', userId)
    .count('id as count');
  return Number(friendCount) + Number(followCount);
}

// ── Discovery (empty feed) ─────────────────────────────────────────────────────

async function getAllRecentTeamPosts(limit = 40) {
  return db('team_posts as p')
    .join('teams as t', 't.id', 'p.team_id')
    .whereNull('p.deleted_at')
    .orderBy('p.created_at', 'desc')
    .limit(limit)
    .select(
      'p.id', 'p.team_id', 'p.type', 'p.media_url', 'p.caption',
      'p.likes_count', 'p.comments_count', 'p.created_at', 'p.metadata',
      't.name as team_name', 't.logo_url as team_logo',
      db.raw("'team_post' as _type"),
    );
}

async function getPublicUpcomingSessions(limit = 20) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return db('sessions as s')
    .join('users as u', 'u.id', 's.creator_id')
    .leftJoin('player_profiles as pp', function () {
      this.on('pp.user_id', '=', 'u.id').andOnNull('pp.deleted_at');
    })
    .where('s.status', 'open')
    .where('s.date', '>=', todayStr)
    .whereNull('s.deleted_at')
    .orderBy('s.date', 'asc')
    .orderBy('s.time', 'asc')
    .limit(limit)
    .select(
      's.id', 's.date', 's.time', 's.end_time', 's.location',
      's.max_players', 's.current_players', 's.status', 's.preferences',
      's.created_at',
      'u.id as creator_id',
      'u.first_name as creator_first_name',
      'u.last_name as creator_last_name',
      'pp.photo_url as creator_photo_url',
      'pp.level as creator_level',
      db.raw("'session' as _type"),
    );
}

async function getSuggestedClubs(limit = 5) {
  return db('organizations')
    .whereNull('deleted_at')
    .whereNot('status', 'pending_validation')
    .where(function () {
      this.where('subscription_status', 'active').orWhere(function () {
        this.where('subscription_status', 'trial').whereRaw('trial_ends_at > NOW()');
      });
    })
    .orderBy('name', 'asc')
    .limit(limit)
    .select('id', 'name', 'city');
}

async function getSuggestedTeams(limit = 5) {
  return db('teams')
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .select('id', 'name', 'logo_url as logo', 'city');
}

module.exports = {
  getFollowedTeamPosts,
  getFriendSessions,
  getLikedPostIds,
  getFriendsForStories,
  getFollowedTeams,
  getConnectionCount,
  getAllRecentTeamPosts,
  getPublicUpcomingSessions,
  getSuggestedClubs,
  getSuggestedTeams,
};
