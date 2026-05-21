const clubsRepo  = require('./clubs.repository');
const venuesRepo = require('../venues/venues.repository');

async function createClub(userId, data) {
  const org = await clubsRepo.create(data);
  await clubsRepo.linkUserToOrg(userId, org.id);
  return org;
}

async function listClubs() {
  return clubsRepo.listWithStats();
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

async function updateClub(clubId, userOrgId, data) {
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
  return clubsRepo.update(clubId, data);
}

async function updateLogo(clubId, userOrgId, filename) {
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
  return clubsRepo.update(clubId, { logo_url: `/uploads/clubs/${filename}` });
}

async function getPublicClub(id) {
  const club = await clubsRepo.getById(id);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  const venues = await venuesRepo.getByOrg(id);
  return { club, venues };
}

async function addPhoto(clubId, userOrgId, filename) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  const current = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  return clubsRepo.update(clubId, { photos_urls: [...current, `/uploads/clubs/${filename}`] });
}

async function removePhoto(clubId, userOrgId, photoUrl) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  const current = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  return clubsRepo.update(clubId, { photos_urls: current.filter((u) => u !== photoUrl) });
}

module.exports = { createClub, listClubs, getClub, updateClub, updateLogo, getPublicClub, addPhoto, removePhoto };
