const bookingsRepo = require('./bookings.repository');
const sessionsRepo = require('../sessions/sessions.repository');
const venuesRepo = require('../venues/venues.repository');
const clubsRepo = require('../clubs/clubs.repository');
const penaltiesRepo = require('../penalties/penalties.repository');
const { isOrgSubscriptionActive } = require('../subscriptions/subscriptions.repository');
const notificationsService = require('../notifications/notifications.service');
const { sendBookingConfirmation, sendManagerBookingNotification } = require('../../emails/confirmation');
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

async function createBooking(userId, { session_id, venue_slot_id, payment_method = 'on_arrival', payment_phone = null, addons = [] }) {
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

  // Block booking if the club's subscription is expired
  const venue = await venuesRepo.getById(slot.venue_id);
  if (venue) {
    const active = await isOrgSubscriptionActive(venue.organization_id);
    if (!active) throw makeError(403, 'Ce club n\'a pas d\'abonnement actif. La réservation est impossible.');
  }

  const bookingData = { session_id, venue_slot_id, payment_method };
  if (payment_phone) bookingData.payment_phone = payment_phone;
  const booking = await bookingsRepo.create(bookingData);
  await venuesRepo.updateSlot(venue_slot_id, { status: 'booked' });

  for (const addon of addons) {
    await bookingsRepo.createAddon({ booking_id: booking.id, ...addon });
  }

  // Post-booking notifications — all non-fatal
  try {
    const venue = await venuesRepo.getById(slot.venue_id);
    const [venueAdmin, booker, players] = await Promise.all([
      venue ? clubsRepo.getAdminByOrg(venue.organization_id) : Promise.resolve(null),
      clubsRepo.getUserById(userId),
      sessionsRepo.getSessionPlayers(session_id),
    ]);

    // Confirmation email to all session players
    await sendBookingConfirmation({ booking, session, slot, venue, players }).catch(() => {});

    // In-app + email notification to venue admin
    if (venueAdmin) {
      await notificationsService.createNotification(
        venueAdmin.id,
        'new_booking',
        `Nouvelle réservation — ${venue.name} · ${slot.date} · ${slot.start_time?.slice(0, 5)}–${slot.end_time?.slice(0, 5)}`
      );
      await sendManagerBookingNotification({
        booking, session, slot, venue,
        booker:      booker  || { name: 'Joueur', email: '' },
        managerEmail: venueAdmin.email,
        playerCount: players.length,
      }).catch(() => {});
    }
  } catch {
    // Non-fatal: notification failure must not block booking
  }

  // In-app notification to the booking creator
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
