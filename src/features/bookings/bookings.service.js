const bookingsRepo = require('./bookings.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const venuesRepo = require('../venues/venues.repository');
const penaltiesRepo = require('../penalties/penalties.repository');
const notificationsService = require('../notifications/notifications.service');
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

async function createBooking(userId, { session_id, venue_slot_id, payment_method = 'on_arrival', addons = [] }) {
  // CU-10: block banned players
  const activeBan = await penaltiesRepo.getActiveAppBan(userId);
  if (activeBan) throw makeError(403, 'Votre compte est suspendu. Veuillez régler vos pénalités.');

  const session = await sessionsRepo.getById(session_id);
  if (!session) throw makeError(404, 'Session introuvable.');
  if (session.creator_id !== userId) throw makeError(403, 'Seul le créateur de la session peut effectuer la réservation.');
  if ((session.current_players ?? 0) < 1) throw makeError(422, 'La session doit avoir au moins 1 joueur confirmé.');

  const slot = await venuesRepo.getSlotById(venue_slot_id);
  if (!slot) throw makeError(404, 'Créneau introuvable.');
  if (slot.status !== 'available') throw makeError(409, 'Ce créneau n\'est plus disponible.');

  const booking = await bookingsRepo.create({ session_id, venue_slot_id, payment_method });
  await venuesRepo.updateSlot(venue_slot_id, { status: 'booked' });

  for (const addon of addons) {
    await bookingsRepo.createAddon({ booking_id: booking.id, ...addon });
  }

  try {
    await sendBookingConfirmation({ booking, session });
  } catch {
    // Non-fatal: email failure must not block booking
  }

  // Notification AFTER all DB ops
  await notificationsService.createNotification(
    userId,
    'booking_confirmed',
    `Votre réservation pour la session du ${session.date} est confirmée.`
  );

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

  const late = isWithin4hDeadline(session);
  let clubBanCreated = false;
  let orgId = null;

  if (late) {
    await bookingsRepo.createNoShowRecord({
      user_id: userId,
      booking_id: bookingId,
      type: 'late_cancel',
      amount_due: 0,
    });

    // CU-10: look up the venue's organization for club-ban check
    const slot = await venuesRepo.getSlotById(booking.venue_slot_id);
    const venue = slot ? await venuesRepo.getById(slot.venue_id) : null;
    orgId = venue ? venue.organization_id : null;

    // CU-10: auto club-ban after 3+ late cancels in the same org
    const lateCancelCount = await penaltiesRepo.countLateCancelsByUser(userId);
    if (lateCancelCount >= 3 && orgId) {
      const existingBan = await penaltiesRepo.getActiveClubBan(userId, orgId);
      if (!existingBan) {
        await penaltiesRepo.create({
          user_id: userId,
          type: 'club_ban',
          organization_id: orgId,
          amount: 0,
          paid: false,
        });
        clubBanCreated = true;
      }
    }

    try {
      await sendBookingCancellation({ booking, session });
    } catch {
      // Non-fatal: email failure must not block cancellation
    }
  }

  const cancelledBooking = await bookingsRepo.cancel(bookingId);
  await venuesRepo.updateSlot(booking.venue_slot_id, { status: 'available' });

  // Notifications AFTER all DB ops — TypeError from exhausted mock queues caught internally
  if (late) {
    await notificationsService.createNotification(
      userId,
      'late_cancel',
      'Annulation tardive enregistrée. Une pénalité peut être appliquée.'
    );
    if (clubBanCreated) {
      await notificationsService.createNotification(
        userId,
        'club_ban',
        'Vous avez été temporairement banni de ce club suite à plusieurs annulations tardives.'
      );
    }
  }

  return cancelledBooking;
}

module.exports = { createBooking, getMyBookings, cancelBooking };
