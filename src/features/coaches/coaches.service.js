const coachesRepo = require('./coaches.repository');
const clubsRepo = require('../clubs/clubs.repository');

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

module.exports = { listAvailableCoaches, getCoach, getMyCoachProfile, updateAvailability, getClubCoaches, addCoachToClub, removeCoachFromClub, getCoachSessions };
