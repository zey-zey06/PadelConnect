const db = require('../../db');

async function createPost({ team_id, created_by, type, media_url, caption, metadata }) {
  const [post] = await db('team_posts')
    .insert({
      team_id, created_by, type,
      media_url, caption: caption || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning('*');
  return post;
}

async function getFeedPosts(limit = 20) {
  return db('team_posts as p')
    .join('teams as t', 't.id', 'p.team_id')
    .join('users as u', 'u.id', 'p.created_by')
    .whereNull('p.deleted_at')
    .orderBy('p.created_at', 'desc')
    .limit(limit)
    .select(
      'p.id', 'p.team_id', 'p.type', 'p.media_url', 'p.caption',
      'p.likes_count', 'p.comments_count', 'p.created_at', 'p.metadata',
      't.name as team_name', 't.logo_url as team_logo',
    );
}

async function getTeamPosts(teamId) {
  return db('team_posts')
    .where({ team_id: teamId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc');
}

async function getPostById(id) {
  return db('team_posts').where({ id }).whereNull('deleted_at').first();
}

async function getUserLiked(postId, userId) {
  return db('team_post_likes').where({ post_id: postId, user_id: userId }).first();
}

async function toggleLike(postId, userId) {
  const existing = await getUserLiked(postId, userId);
  if (existing) {
    await db('team_post_likes').where({ post_id: postId, user_id: userId }).delete();
    await db('team_posts').where({ id: postId }).decrement('likes_count', 1);
    return { liked: false };
  }
  await db('team_post_likes').insert({ post_id: postId, user_id: userId });
  await db('team_posts').where({ id: postId }).increment('likes_count', 1);
  return { liked: true };
}

async function getComments(postId) {
  return db('team_post_comments as c')
    .join('users as u', 'u.id', 'c.user_id')
    .where({ 'c.post_id': postId })
    .whereNull('c.deleted_at')
    .orderBy('c.created_at', 'asc')
    .select(
      'c.id', 'c.body', 'c.created_at', 'c.user_id',
      db.raw("TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name,''))) as author_name"),
    );
}

async function addComment(postId, userId, body) {
  const [comment] = await db('team_post_comments')
    .insert({ post_id: postId, user_id: userId, body })
    .returning('*');
  await db('team_posts').where({ id: postId }).increment('comments_count', 1);
  return comment;
}

module.exports = {
  createPost, getFeedPosts, getTeamPosts, getPostById,
  toggleLike, getUserLiked, getComments, addComment,
};
