const crypto = require('crypto');
const teamsRepo = require('./teams.repository');
const { sendTeamInvitation } = require('../../emails/team-invitation');
const { createNotification } = require('../notifications/notifications.service');
const db = require('../../db');

const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createTeam(userId, { name, logo_url, description, city }) {
  if (!name || !name.trim()) throw makeError(422, 'Le nom de la team est requis.');

  const team = await teamsRepo.createTeam({
    name: name.trim(),
    logo_url: logo_url || null,
    description: description || null,
    city: city || 'Abidjan',
    created_by: userId,
  });

  // Add creator as admin member
  await teamsRepo.addTeamMember({
    team_id: team.id,
    user_id: userId,
    role: 'admin',
    status: 'active',
    invited_by: userId,
  });

  // Link team to user
  await teamsRepo.updateUserTeamId(userId, team.id);

  return team;
}

async function getTeam(teamId, viewerUserId = null) {
  const team = await teamsRepo.getTeamById(teamId);
  if (!team) throw makeError(404, 'Équipe introuvable.');

  const [members, followers_count, tournament_count] = await Promise.all([
    teamsRepo.getTeamMembers(teamId),
    teamsRepo.getFollowerCount(teamId),
    teamsRepo.getTournamentCount(teamId),
  ]);

  let is_following = false;
  if (viewerUserId) {
    is_following = await teamsRepo.isFollowing(teamId, viewerUserId);
  }

  return { team: { ...team, followers_count, tournament_count }, members, is_following };
}

async function getMyTeam(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id) throw makeError(404, 'Vous n\'avez pas encore d\'équipe.');
  return getTeam(user.team_id, userId);
}

async function toggleFollow(teamId, userId) {
  const team = await teamsRepo.getTeamById(teamId);
  if (!team) throw makeError(404, 'Équipe introuvable.');

  const already = await teamsRepo.isFollowing(teamId, userId);
  if (already) {
    await teamsRepo.unfollowTeam(teamId, userId);
  } else {
    await teamsRepo.followTeam(teamId, userId);
    const follower = await db('users').where({ id: userId }).first();
    const name = [follower?.first_name, follower?.last_name].filter(Boolean).join(' ') || 'Quelqu\'un';
    const adminIds = await db('team_members')
      .where({ team_id: teamId, role: 'admin', status: 'active' })
      .pluck('user_id');
    for (const adminId of adminIds) {
      createNotification(adminId, 'club_post', `${name} suit maintenant votre équipe ${team.name}.`, userId);
    }
  }

  const followers_count = await teamsRepo.getFollowerCount(teamId);
  return { following: !already, followers_count };
}

async function notifyFollowers(teamId, message, actorId) {
  const followerIds = await teamsRepo.getFollowerUserIds(teamId);
  for (const userId of followerIds) {
    createNotification(userId, 'club_post', message, actorId);
  }
}

async function inviteMember(teamId, inviterId, { email, role }) {
  if (!email || !email.trim()) throw makeError(422, 'Email requis.');

  const team = await teamsRepo.getTeamById(teamId);
  if (!team) throw makeError(404, 'Équipe introuvable.');

  const inviterMember = await teamsRepo.getActiveMemberByUserId(teamId, inviterId);
  if (!inviterMember || inviterMember.role !== 'admin') {
    throw makeError(403, 'Seul l\'administrateur de l\'équipe peut inviter des membres.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await teamsRepo.getPendingInviteByEmail(teamId, normalizedEmail);
  if (existing) throw makeError(409, 'Une invitation est déjà en attente pour cet email.');

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + INVITE_TTL_MS);

  const existingUser = await db('users').where({ email: normalizedEmail }).whereNull('deleted_at').first();

  await teamsRepo.addTeamMember({
    team_id: teamId,
    user_id: existingUser?.id || null,
    role: role || 'staff',
    status: 'pending',
    invited_by: inviterId,
    invite_email: normalizedEmail,
    invite_token: token,
    invite_expires_at: expires,
  });

  const inviter = await db('users').where({ id: inviterId }).first();
  const inviterName = [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') || 'L\'équipe';
  const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const joinUrl = `${baseUrl}/team/join/${token}`;

  sendTeamInvitation({ toEmail: normalizedEmail, teamName: team.name, inviterName, joinUrl }).catch(() => {});

  return { ok: true };
}

async function joinTeam(token, userId) {
  if (!token) throw makeError(400, 'Token requis.');

  const member = await teamsRepo.getMemberByToken(token);
  if (!member) throw makeError(400, 'Lien d\'invitation invalide ou déjà utilisé.');

  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    throw makeError(400, 'Ce lien d\'invitation a expiré.');
  }

  if (member.status === 'active') throw makeError(400, 'Cette invitation a déjà été acceptée.');

  const updatedMember = await teamsRepo.acceptInvitation(member.id, userId);

  await teamsRepo.updateUserTeamId(userId, member.team_id);

  const team = await teamsRepo.getTeamById(member.team_id);
  return { ok: true, team };
}

module.exports = { createTeam, getTeam, getMyTeam, toggleFollow, notifyFollowers, inviteMember, joinTeam };
