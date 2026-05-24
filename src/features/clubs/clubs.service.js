const bcrypt     = require('bcrypt');
const crypto     = require('crypto');
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

async function updateLogo(clubId, userOrgId, logoUrl) {
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
  return clubsRepo.update(clubId, { logo_url: logoUrl });
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

async function updateCover(clubId, userOrgId, coverUrl) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  return clubsRepo.update(clubId, { cover_url: coverUrl });
}

async function addPhoto(clubId, userOrgId, photoUrl) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  const current = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  return clubsRepo.update(clubId, { photos_urls: [...current, photoUrl] });
}

async function removePhoto(clubId, userOrgId, photoUrl) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  const current = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  return clubsRepo.update(clubId, { photos_urls: current.filter((u) => u !== photoUrl) });
}

async function getClubSlots(clubId, date) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }

  const venues = await venuesRepo.getByOrg(clubId);
  if (venues.length === 0) return { date, venues: [] };

  const venueIds = venues.map((v) => v.id);
  const slots    = await venuesRepo.getSlotsByVenueIds(venueIds, date);

  const slotsByVenue = {};
  for (const slot of slots) {
    if (!slotsByVenue[slot.venue_id]) slotsByVenue[slot.venue_id] = [];
    slotsByVenue[slot.venue_id].push(slot);
  }

  return {
    date,
    venues: venues.map((v) => ({
      id:          v.id,
      name:        v.name,
      description: v.description,
      slots:       slotsByVenue[v.id] ?? [],
    })),
  };
}

async function getBallPickers(clubId) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  return clubsRepo.getBallPickersByOrg(club.id);
}

/**
 * Create a ball-picker user attached to this club.
 * Ball-pickers are staff managed by the venue admin — they are not standard app
 * users and cannot log in via normal auth flow.
 */
async function createBallPicker(clubId, userOrgId, { first_name, last_name, phone }) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }

  // Unique placeholder email — not usable for login
  const ts   = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const email = `bp.${ts}.${rand}@staff.padelconnect.internal`;

  // Random bcrypt hash — this user will never log in via password
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

  return clubsRepo.createBallPicker({
    email,
    password_hash:  passwordHash,
    role:           'ball_picker',
    organization_id: club.id,
    first_name:     first_name || null,
    last_name:      last_name  || null,
    phone:          phone      || null,
    email_verified: true,
    status:         'active',
  });
}

async function removeBallPicker(clubId, userOrgId, userId) {
  const club = await clubsRepo.getById(clubId);
  if (!club) { const err = new Error('Club introuvable.'); err.status = 404; throw err; }
  if (club.id !== userOrgId) { const err = new Error('Accès refusé.'); err.status = 403; throw err; }
  return clubsRepo.removeBallPicker(userId);
}

module.exports = { createClub, listClubs, getClub, updateClub, updateLogo, updateCover, getPublicClub, addPhoto, removePhoto, getClubSlots, getBallPickers, createBallPicker, removeBallPicker };
