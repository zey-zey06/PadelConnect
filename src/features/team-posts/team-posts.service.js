const repo = require('./team-posts.repository');
const teamsRepo = require('../teams/teams.repository');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function assertMember(userId, teamId) {
  const member = await teamsRepo.getActiveMemberByUserId(teamId, userId);
  if (!member) throw makeError(403, 'Accès refusé.');
  if (!['admin', 'manager'].includes(member.role)) throw makeError(403, 'Réservé aux admins et managers.');
}

async function createPost(userId, teamId, { type, media_url, caption }) {
  await assertMember(userId, teamId);
  return repo.createPost({ team_id: teamId, created_by: userId, type, media_url, caption });
}

async function getFeedPosts() {
  return repo.getFeedPosts(30);
}

async function getTeamPosts(teamId) {
  return repo.getTeamPosts(teamId);
}

async function toggleLike(userId, postId) {
  const post = await repo.getPostById(postId);
  if (!post) throw makeError(404, 'Post introuvable.');
  const result = await repo.toggleLike(postId, userId);
  const updatedPost = await repo.getPostById(postId);
  return { ...result, likes_count: updatedPost.likes_count };
}

async function getComments(postId) {
  return repo.getComments(postId);
}

async function addComment(userId, postId, body) {
  const post = await repo.getPostById(postId);
  if (!post) throw makeError(404, 'Post introuvable.');
  return repo.addComment(postId, userId, body.trim());
}

module.exports = { createPost, getFeedPosts, getTeamPosts, toggleLike, getComments, addComment };
