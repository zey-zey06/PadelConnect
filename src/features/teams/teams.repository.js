const db = require('../../db');

async function createTeam({ name, logo_url, description, city, created_by }) {
  const [team] = await db('teams')
    .insert({ name, logo_url: logo_url || null, description: description || null, city: city || 'Abidjan', created_by })
    .returning('*');
  return team;
}

async function getTeamById(id) {
  return db('teams').where({ id }).whereNull('deleted_at').first();
}

async function updateUserTeamId(userId, teamId) {
  return db('users').where({ id: userId }).update({ team_id: teamId, updated_at: new Date() });
}

async function addTeamMember({ team_id, user_id, role, status, invited_by, invite_email, invite_token, invite_expires_at }) {
  const [member] = await db('team_members')
    .insert({
      team_id,
      user_id: user_id || null,
      role: role || 'staff',
      status: status || 'pending',
      invited_by: invited_by || null,
      invite_email: invite_email || null,
      invite_token: invite_token || null,
      invite_expires_at: invite_expires_at || null,
    })
    .returning('*');
  return member;
}

async function getTeamMembers(team_id) {
  return db('team_members as tm')
    .leftJoin('users as u', 'u.id', 'tm.user_id')
    .where('tm.team_id', team_id)
    .select(
      'tm.id',
      'tm.role',
      'tm.status',
      'tm.invite_email',
      'tm.created_at',
      'u.id as user_id',
      'u.first_name',
      'u.last_name',
      'u.email',
    );
}

async function getMemberByToken(token) {
  return db('team_members').where({ invite_token: token }).first();
}

async function acceptInvitation(memberId, userId) {
  const [member] = await db('team_members')
    .where({ id: memberId })
    .update({ user_id: userId, status: 'active', invite_token: null, invite_expires_at: null })
    .returning('*');
  return member;
}

async function getActiveMemberByUserId(team_id, user_id) {
  return db('team_members').where({ team_id, user_id, status: 'active' }).first();
}

async function getPendingInviteByEmail(team_id, email) {
  return db('team_members').where({ team_id, invite_email: email, status: 'pending' }).first();
}

// ── Followers ──────────────────────────────────────────────────────────────────

async function followTeam(teamId, userId) {
  await db('team_followers')
    .insert({ team_id: teamId, user_id: userId })
    .onConflict(['team_id', 'user_id']).ignore();
}

async function unfollowTeam(teamId, userId) {
  await db('team_followers').where({ team_id: teamId, user_id: userId }).delete();
}

async function isFollowing(teamId, userId) {
  const row = await db('team_followers').where({ team_id: teamId, user_id: userId }).first();
  return !!row;
}

async function getFollowerCount(teamId) {
  const [{ count }] = await db('team_followers').where({ team_id: teamId }).count('id as count');
  return Number(count);
}

async function getFollowerUserIds(teamId) {
  const rows = await db('team_followers').where({ team_id: teamId }).select('user_id');
  return rows.map((r) => r.user_id);
}

async function getTournamentCount(teamId) {
  const [{ count }] = await db('tournaments').where({ team_id: teamId }).count('id as count');
  return Number(count);
}

module.exports = {
  createTeam,
  getTeamById,
  updateUserTeamId,
  addTeamMember,
  getTeamMembers,
  getMemberByToken,
  acceptInvitation,
  getActiveMemberByUserId,
  getPendingInviteByEmail,
  followTeam,
  unfollowTeam,
  isFollowing,
  getFollowerCount,
  getFollowerUserIds,
  getTournamentCount,
};
