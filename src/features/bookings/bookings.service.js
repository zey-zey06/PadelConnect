const bookingsRepo = require('./bookings.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const venuesRepo = require('../venues/venues.repository');
const { sendBookingConfirmation } = require('../../emails/confirmation');
const { sendBookingCancellation } = require('../../emails/cancellation');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isWithin4hDeadline(session) {
  const sessionDateTime = new Date(`${session.date}T${session.time}`);
  const hoursDiff = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursDiff <= 4;
}

async function createBooking(userId, { session_id, venue_slot_id, addons = [] }) {
  const session = await sessionsRepo.getById(session_id);
  if (!session) throw makeError(404, 'Session introuvable.');
  if (session.creator_id !== userId) throw makeError(403, 'Seul le créateur de la session peut effectuer la réservation.');
  if (session.status !== 'complete') throw makeError(422, 'La session doit avoir au moins 2 joueurs confirmés.');

  const slot = await venuesRepo.getSlotById(venue_slot_id);
  if (!slot) throw makeError(404, 'Créneau introuvable.');
  if (slot.status !== 'available') throw makeError(409, 'Ce créneau n\'est plus disponible.');

  const booking = await bookingsRepo.create({ session_id, venue_slot_id });
  await venuesRepo.updateSlot(venue_slot_id, { status: 'booked' });

  for (const addon of addons) {
    await bookingsRepo.createAddon({ booking_id: booking.id, ...addon });
  }

  try {
    await sendBookingConfirmation({ booking, session });
  } catch {
    // Non-fatal: email failure must not block booking
  }

  return booking;
}

async function getMyBookings(userId) {
  return bookingsRepo.getByUser(userId);
}

async function cancelBooking(bookingId, userId) {
  const booking = await bookingsRepo.getById(bookingId);
  if (!booking) throw makeError(404, 'Réservation introuvable.');

  const session = await sessionsRepo.getById(booking.session_id);
  if (session.creator_id !== userId) throw makeError(403, 'Accès refusé.');

  if (isWithin4hDeadline(session)) {
    await bookingsRepo.createNoShowRecord({
      user_id: userId,
      booking_id: bookingId,
      type: 'late_cancel',
      amount_due: 0,
    });

    try {
      await sendBookingCancellation({ booking, session });
    } catch {
      // Non-fatal: email failure must not block cancellation
    }
  }

  const cancelledBooking = await bookingsRepo.cancel(bookingId);
  await venuesRepo.updateSlot(booking.venue_slot_id, { status: 'available' });

  return cancelledBooking;
}

module.exports = { createBooking, getMyBookings, cancelBooking };
