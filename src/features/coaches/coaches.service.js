const coachesRepo = require('./coaches.repository');
const clubsRepo = require('../clubs/clubs.repository');
const notificationsService = require('../notifications/notifications.service');

async function listAvailableCoaches(filters = {}) {
  return coachesRepo.listAvailable(filters);
}

async function getCoach(id) {
  const profile = await coachesRepo.getById(id);
  if (!profile) {
    const err = new Error('Coach introuvable.');
    err.status = 404;
    throw err;
  }
  return profile;
}

async function updateAvailability(coachProfileId, userId, availability) {
  const profile = await coachesRepo.getById(coachProfileId);
  if (!profile) {
    const err = new Error('Coach introuvable.');
    err.status = 404;
    throw err;
  }
  if (profile.user_id !== userId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  return coachesRepo.updateAvailability(coachProfileId, availability);
}

async function getClubCoaches(clubId) {
  const club = await clubsRepo.getById(clubId);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  return coachesRepo.getByOrg(club.id);
}

async function addCoachToClub(clubId, userOrgId, coachEmail) {
  const club = await clubsRepo.getById(clubId);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  if (club.id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  const coachUser = await coachesRepo.getCoachUserByEmail(coachEmail);
  if (!coachUser) {
    const err = new Error('Aucun coach trouvé avec cet email. Vérifiez que l\'utilisateur existe et possède le rôle coach.');
    err.status = 404;
    throw err;
  }
  return coachesRepo.attachToClub(coachUser.id, club.id);
}

async function removeCoachFromClub(clubId, userOrgId, coachUserId) {
  const club = await clubsRepo.getById(clubId);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  if (club.id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  return coachesRepo.detachFromClub(coachUserId);
}

async function getMyCoachProfile(userId) {
  const profile = await coachesRepo.getByUserId(userId);
  if (!profile) {
    const err = new Error('Profil coach introuvable.');
    err.status = 404;
    throw err;
  }
  return profile;
}

async function getCoachSessions(coachProfileId) {
  const profile = await coachesRepo.getById(coachProfileId);
  if (!profile) {
    const err = new Error('Coach introuvable.');
    err.status = 404;
    throw err;
  }
  const sessions = await coachesRepo.getSessionsByCoach(coachProfileId);
  const now = new Date();
  return {
    upcoming: sessions.filter((s) => new Date(`${s.date}T${s.time}`) >= now),
    past: sessions.filter((s) => new Date(`${s.date}T${s.time}`) < now),
  };
}

// ── Club invitations ──────────────────────────────────────────────────────────

async function sendClubInvitation(clubId, userOrgId, invitedByUserId, coachEmail) {
  const club = await clubsRepo.getById(clubId);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  if (club.id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }

  const coachUser = await coachesRepo.getCoachUserByEmail(coachEmail);
  if (!coachUser) {
    const err = new Error("Aucun coach trouvé avec cet email. Vérifiez que l'utilisateur existe et possède le rôle coach.");
    err.status = 404;
    throw err;
  }

  const alreadyPending = await coachesRepo.hasPendingInvitation(club.id, coachUser.id);
  if (alreadyPending) {
    const err = new Error('Une invitation est déjà en attente pour ce coach.');
    err.status = 409;
    throw err;
  }

  const invitation = await coachesRepo.createInvitation({
    organization_id: club.id,
    coach_user_id:   coachUser.id,
    invited_by:      invitedByUserId,
  });

  // Notify the coach (fire-and-forget)
  notificationsService
    .createNotification(
      coachUser.id,
      'club_invitation',
      `Le club « ${club.name} » vous invite à rejoindre leur équipe.`,
    )
    .catch(() => {});

  return invitation;
}

async function getPendingInvitations(coachUserId) {
  return coachesRepo.getPendingInvitationsByCoach(coachUserId);
}

async function respondToInvitation(invitationId, coachUserId, status) {
  const invitation = await coachesRepo.getInvitationById(invitationId);
  if (!invitation) {
    const err = new Error('Invitation introuvable.');
    err.status = 404;
    throw err;
  }
  if (invitation.coach_user_id !== coachUserId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  if (invitation.status !== 'pending') {
    const err = new Error('Cette invitation a déjà été traitée.');
    err.status = 409;
    throw err;
  }

  await coachesRepo.updateInvitationStatus(invitationId, status);

  // On acceptance: attach the coach to the club
  if (status === 'accepted') {
    await coachesRepo.attachToClub(coachUserId, invitation.organization_id);
  }

  return { ok: true, status };
}

module.exports = { listAvailableCoaches, getCoach, getMyCoachProfile, updateAvailability, getClubCoaches, addCoachToClub, removeCoachFromClub, getCoachSessions, sendClubInvitation, getPendingInvitations, respondToInvitation };
