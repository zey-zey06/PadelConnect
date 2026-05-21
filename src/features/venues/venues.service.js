const venuesRepo = require('./venues.repository');
const clubsRepo = require('../clubs/clubs.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const notificationsService = require('../notifications/notifications.service');

// ── Default slot templates ────────────────────────────────────────────────────
const SLOT_TEMPLATES = [
  // Morning: 07:00–16:00, 1 h each, 15 000 FCFA
  { start_time: '07:00', end_time: '08:00', price: 15000 },
  { start_time: '08:00', end_time: '09:00', price: 15000 },
  { start_time: '09:00', end_time: '10:00', price: 15000 },
  { start_time: '10:00', end_time: '11:00', price: 15000 },
  { start_time: '11:00', end_time: '12:00', price: 15000 },
  { start_time: '12:00', end_time: '13:00', price: 15000 },
  { start_time: '13:00', end_time: '14:00', price: 15000 },
  { start_time: '14:00', end_time: '15:00', price: 15000 },
  { start_time: '15:00', end_time: '16:00', price: 15000 },
  // Evening: 16:00–23:30, 1 h 30 each, 30 000 FCFA
  { start_time: '16:00', end_time: '17:30', price: 30000 },
  { start_time: '17:30', end_time: '19:00', price: 30000 },
  { start_time: '19:00', end_time: '20:30', price: 30000 },
  { start_time: '20:30', end_time: '22:00', price: 30000 },
  { start_time: '22:00', end_time: '23:30', price: 30000 },
];

async function generateDefaultSlots(venueId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const tmpl of SLOT_TEMPLATES) {
      rows.push({ venue_id: venueId, date: dateStr, ...tmpl, status: 'available' });
    }
  }
  await venuesRepo.bulkCreateSlots(rows);
}

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
  const venue = await venuesRepo.createVenue({ ...data, organization_id: club.id });
  // Auto-generate default slots for the next 30 days — non-fatal
  try { await generateDefaultSlots(venue.id); } catch { /* slot gen failure must not block venue creation */ }
  return venue;
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

async function bulkUpdateSlotPrice(venueId, userOrgId, startTime, endTime, price) {
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
  await venuesRepo.bulkUpdateSlotPrice(venueId, startTime, endTime, price);
  return { updated: true };
}

async function fillMissingSlots() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];
  for (let d = 0; d < 30; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    dates.push(dt.toISOString().slice(0, 10));
  }

  const venues = await venuesRepo.getAllVenues();
  if (venues.length === 0) return 0;

  const venueIds = venues.map((v) => v.id);
  const existing = await venuesRepo.getSlotsByVenuesAndDates(venueIds, dates[0], dates[dates.length - 1]);
  // Postgres returns time as 'HH:MM:SS' and date may be a Date object — normalise both.
  const existingSet = new Set(
    existing.map((s) => `${s.venue_id}|${String(s.date).slice(0, 10)}|${String(s.start_time).slice(0, 5)}`)
  );

  const rows = [];
  for (const venue of venues) {
    for (const dateStr of dates) {
      for (const tmpl of SLOT_TEMPLATES) {
        if (!existingSet.has(`${venue.id}|${dateStr}|${tmpl.start_time}`)) {
          rows.push({ venue_id: venue.id, date: dateStr, ...tmpl, status: 'available' });
        }
      }
    }
  }

  if (rows.length > 0) await venuesRepo.bulkCreateSlots(rows);
  return rows.length;
}

module.exports = { addVenue, listVenuesByClub, addSlot, getAvailableSlots, updateSlot, deleteSlot, bulkUpdateSlotPrice, fillMissingSlots };
