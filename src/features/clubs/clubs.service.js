const clubsRepo = require('./clubs.repository');

async function createClub(userId, data) {
  const org = await clubsRepo.create(data);
  await clubsRepo.linkUserToOrg(userId, org.id);
  return org;
}

async function listClubs() {
  return clubsRepo.list();
}

async function getClub(id) {
  const club = await clubsRepo.getById(id);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  return club;
}

module.exports = { createClub, listClubs, getClub };
