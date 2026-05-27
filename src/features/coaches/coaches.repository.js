const db = require('../../db');

async function listAvailable(filters = {}) {
  let query = db('coach_profiles')
    .join('users', 'coach_profiles.user_id', 'users.id')
    .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
    .whereNull('coach_profiles.deleted_at');

  if (filters.clubId) {
    query = query.where(function () {
      this.where('coach_profiles.is_independent', true)
          .orWhere('coach_profiles.organization_id', filters.clubId);
    });
  } else {
    query = query.where('coach_profiles.is_independent', true);
  }

  return query.select(
    'coach_profiles.*',
    'users.first_name as user_first_name',
    'users.last_name  as user_last_name',
    'users.email      as user_email',
    'player_profiles.photo_url as user_photo_url',
  );
}

async function getById(id) {
  return db('coach_profiles').where({ id }).whereNull('deleted_at').first();
}

async function updateAvailability(id, availability) {
  const [row] = await db('coach_profiles')
    .where({ id })
    .update({ availability: JSON.stringify(availability), updated_at: new Date() })
    .returning('*');
  return row;
}

async function getByOrg(organizationId) {
  return db('coach_profiles')
    .join('users', 'coach_profiles.user_id', 'users.id')
    .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
    .where('coach_profiles.organization_id', organizationId)
    .whereNull('coach_profiles.deleted_at')
    .orderBy('coach_profiles.created_at', 'asc')
    .select(
      'coach_profiles.*',
      'users.first_name as user_first_name',
      'users.last_name  as user_last_name',
      'users.email      as user_email',
      'player_profiles.photo_url as user_photo_url',
    );
}

async function getCoachUser(userId) {
  return db('users').where({ id: userId, role: 'coach' }).whereNull('deleted_at').first();
}

async function getCoachUserByEmail(email) {
  return db('users').where({ email, role: 'coach' }).whereNull('deleted_at').first();
}

async function attachToClub(userId, organizationId) {
  const [row] = await db('coach_profiles')
    .where({ user_id: userId })
    .update({ organization_id: organizationId, is_independent: false, updated_at: new Date() })
    .returning('*');
  return row;
}

async function detachFromClub(userId) {
  const [row] = await db('coach_profiles')
    .where({ user_id: userId })
    .update({ organization_id: null, is_independent: true, updated_at: new Date() })
    .returning('*');
  return row;
}

async function getByUserId(userId) {
  return db('coach_profiles').where({ user_id: userId }).whereNull('deleted_at').first();
}

async function getSessionsByCoach(coachProfileId) {
  return db('sessions')
    .join('bookings', 'sessions.id', 'bookings.session_id')
    .join('booking_addons', 'bookings.id', 'booking_addons.booking_id')
    .join('coach_profiles', 'booking_addons.user_id', 'coach_profiles.user_id')
    .where('coach_profiles.id', coachProfileId)
    .where('booking_addons.type', 'coach')
    .whereNull('bookings.deleted_at')
    .whereNull('sessions.deleted_at')
    .orderBy('sessions.date', 'desc')
    .select('sessions.*');
}

// ── Club invitations ──────────────────────────────────────────────────────────

async function createInvitation({ organization_id, coach_user_id, invited_by, role = 'coach' }) {
  const [row] = await db('club_invitations')
    .insert({ organization_id, coach_user_id, invited_by, role })
    .returning('*');
  return row;
}

async function getUserByEmail(email) {
  return db('users').where({ email }).whereNull('deleted_at').first();
}

async function getPendingInvitationsByCoach(coachUserId) {
  return db('club_invitations')
    .join('organizations', 'club_invitations.organization_id', 'organizations.id')
    .join('users as inviter', 'club_invitations.invited_by', 'inviter.id')
    .where({ 'club_invitations.coach_user_id': coachUserId, 'club_invitations.status': 'pending', 'club_invitations.role': 'coach' })
    .whereNull('organizations.deleted_at')
    .orderBy('club_invitations.created_at', 'desc')
    .select(
      'club_invitations.id',
      'club_invitations.organization_id',
      'club_invitations.status',
      'club_invitations.created_at',
      'organizations.name as organization_name',
      'inviter.first_name as inviter_first_name',
      'inviter.last_name  as inviter_last_name',
    );
}

async function getPendingBallPickerInvitations(userId) {
  return db('club_invitations')
    .join('organizations', 'club_invitations.organization_id', 'organizations.id')
    .join('users as inviter', 'club_invitations.invited_by', 'inviter.id')
    .where({ 'club_invitations.coach_user_id': userId, 'club_invitations.status': 'pending', 'club_invitations.role': 'ball_picker' })
    .whereNull('organizations.deleted_at')
    .orderBy('club_invitations.created_at', 'desc')
    .select(
      'club_invitations.id',
      'club_invitations.organization_id',
      'club_invitations.status',
      'club_invitations.created_at',
      'organizations.name as organization_name',
      'inviter.first_name as inviter_first_name',
      'inviter.last_name  as inviter_last_name',
    );
}

async function getInvitationById(id) {
  return db('club_invitations').where({ id }).first();
}

async function updateInvitationStatus(id, status) {
  const [row] = await db('club_invitations')
    .where({ id })
    .update({ status, updated_at: new Date() })
    .returning('*');
  return row;
}

async function hasPendingInvitation(organization_id, coach_user_id) {
  const row = await db('club_invitations')
    .where({ organization_id, coach_user_id, status: 'pending' })
    .first('id');
  return !!row;
}

async function getPendingInvitationsByOrg(organizationId) {
  return db('club_invitations')
    .join('users as coach', 'club_invitations.coach_user_id', 'coach.id')
    .leftJoin('player_profiles', 'coach.id', 'player_profiles.user_id')
    .where({ 'club_invitations.organization_id': organizationId, 'club_invitations.status': 'pending', 'club_invitations.role': 'coach' })
    .orderBy('club_invitations.created_at', 'desc')
    .select(
      'club_invitations.id',
      'club_invitations.coach_user_id',
      'club_invitations.status',
      'club_invitations.created_at',
      'club_invitations.role',
      'coach.first_name as coach_first_name',
      'coach.last_name  as coach_last_name',
      'coach.email      as coach_email',
      'player_profiles.photo_url as coach_photo_url',
    );
}

async function getPendingBallPickerInvitationsByOrg(organizationId) {
  return db('club_invitations')
    .join('users as invitee', 'club_invitations.coach_user_id', 'invitee.id')
    .leftJoin('player_profiles', 'invitee.id', 'player_profiles.user_id')
    .where({ 'club_invitations.organization_id': organizationId, 'club_invitations.status': 'pending', 'club_invitations.role': 'ball_picker' })
    .orderBy('club_invitations.created_at', 'desc')
    .select(
      'club_invitations.id',
      'club_invitations.coach_user_id as user_id',
      'club_invitations.status',
      'club_invitations.created_at',
      'invitee.first_name as user_first_name',
      'invitee.last_name  as user_last_name',
      'invitee.email      as user_email',
      'player_profiles.photo_url as user_photo_url',
    );
}

async function deleteInvitation(id, organizationId) {
  await db('club_invitations')
    .where({ id, organization_id: organizationId, status: 'pending' })
    .delete();
}

module.exports = {
  listAvailable, getById, getByUserId, updateAvailability, getByOrg,
  getCoachUser, getCoachUserByEmail, getUserByEmail,
  attachToClub, detachFromClub, getSessionsByCoach,
  createInvitation, getPendingInvitationsByCoach, getPendingBallPickerInvitations,
  getPendingInvitationsByOrg, getPendingBallPickerInvitationsByOrg,
  getInvitationById, updateInvitationStatus, hasPendingInvitation, deleteInvitation,
};
