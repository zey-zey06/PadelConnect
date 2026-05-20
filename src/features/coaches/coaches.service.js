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

async function addCoachToClub(clubId, userOrgId, coachUserId) {
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
  const coachUser = await coachesRepo.getCoachUser(coachUserId);
  if (!coachUser) {
    const err = new Error('Utilisateur coach introuvable.');
    err.status = 404;
    throw err;
  }
  return coachesRepo.attachToClub(coachUserId, club.id);
}

module.exports = { listAvailableCoaches, getCoach, updateAvailability, getClubCoaches, addCoachToClub };
