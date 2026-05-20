const venuesRepo = require('./venues.repository');
const clubsRepo = require('../clubs/clubs.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const notificationsService = require('../notifications/notifications.service');

async function addVenue(clubId, userId, userOrgId, data) {
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
  return venuesRepo.createVenue({ ...data, organization_id: club.id });
}

async function listVenuesByClub(clubId) {
  const club = await clubsRepo.getById(clubId);
  if (!club) {
    const err = new Error('Club introuvable.');
    err.status = 404;
    throw err;
  }
  return venuesRepo.getByOrg(club.id);
}

async function addSlot(venueId, userOrgId, data) {
  const venue = await venuesRepo.getById(venueId);
  if (!venue) {
    const err = new Error('Terrain introuvable.');
    err.status = 404;
    throw err;
  }
  if (venue.organization_id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  return venuesRepo.createSlot({ ...data, venue_id: venueId });
}

async function getAvailableSlots(venueId, filters = {}) {
  const venue = await venuesRepo.getById(venueId);
  if (!venue) {
    const err = new Error('Terrain introuvable.');
    err.status = 404;
    throw err;
  }
  return venuesRepo.getSlots(venueId, filters);
}

async function updateSlot(venueId, slotId, userOrgId, data) {
  const venue = await venuesRepo.getById(venueId);
  if (!venue) {
    const err = new Error('Terrain introuvable.');
    err.status = 404;
    throw err;
  }
  if (venue.organization_id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  const slot = await venuesRepo.getSlotById(slotId);
  if (!slot) {
    const err = new Error('Créneau introuvable.');
    err.status = 404;
    throw err;
  }
  return venuesRepo.updateSlot(slotId, data);
}

async function deleteSlot(venueId, slotId, userOrgId) {
  const venue = await venuesRepo.getById(venueId);
  if (!venue) {
    const err = new Error('Terrain introuvable.');
    err.status = 404;
    throw err;
  }
  if (venue.organization_id !== userOrgId) {
    const err = new Error('Accès refusé.');
    err.status = 403;
    throw err;
  }
  const slot = await venuesRepo.getSlotById(slotId);
  if (!slot) {
    const err = new Error('Créneau introuvable.');
    err.status = 404;
    throw err;
  }
  const booking = await venuesRepo.getActiveBookingForSlot(slotId);
  if (booking) {
    await venuesRepo.cancelBooking(booking.id);
  }
  const deletedSlot = await venuesRepo.softDeleteSlot(slotId);

  // Notify the player who booked — AFTER all DB ops, non-fatal
  if (booking) {
    try {
      const session = await sessionsRepo.getById(booking.session_id);
      if (session) {
        await notificationsService.createNotification(
          session.creator_id,
          'slot_cancelled',
          'Votre créneau a été annulé par le gestionnaire du club.'
        );
      }
    } catch {
      // Non-fatal
    }
  }

  return deletedSlot;
}

module.exports = { addVenue, listVenuesByClub, addSlot, getAvailableSlots, updateSlot, deleteSlot };
