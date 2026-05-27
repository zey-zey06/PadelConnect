const sessionsRepo = require('./sessions.repository');
const bookingsRepo = require('../bookings/bookings.repository');
const venuesRepo   = require('../venues/venues.repository');
const clubsRepo    = require('../clubs/clubs.repository');
const adminRepo    = require('../admin/admin.repository');
const notificationsService = require('../notifications/notifications.service');
const { sendBookingCancellation } = require('../../emails/cancellation');

function fmtDateFr(dateVal) {
  const iso = String(dateVal ?? '').slice(0, 10);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function create(userId, data) {
  return sessionsRepo.create({
    creator_id: userId,
    date: data.date,
    time: data.time,
    end_time: data.end_time || null,
    max_players: data.max_players,
    current_players: 1, // creator is automatically player #1
    preferences: data.preferences || null,
  });
}

async function list(filters) {
  return sessionsRepo.list(filters);
}

async function getById(sessionId) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  return session;
}

async function updateStatus(sessionId, userId, status) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  if (session.creator_id !== userId) {
    const err = new Error('Accès refusé. Seul le créateur peut modifier le statut.');
    err.status = 403;
    throw err;
  }

  const updated = await sessionsRepo.updateStatus(sessionId, status);

  if (status === 'cancelled') {
    // Auto-cancel linked booking + notify players + manager — all non-fatal
    try {
      const booking = await bookingsRepo.getActiveBookingBySession(sessionId);
      if (booking) {
        await bookingsRepo.cancel(booking.id);
        const slot = await venuesRepo.getSlotById(booking.venue_slot_id);
        if (slot) await venuesRepo.updateSlot(booking.venue_slot_id, { status: 'available' });

        const venue      = slot ? await venuesRepo.getById(slot.venue_id) : null;
        const venueAdmin = venue ? await clubsRepo.getAdminByOrg(venue.organization_id) : null;
        const players    = await sessionsRepo.getSessionPlayers(sessionId);

        for (const player of players) {
          await notificationsService.createNotification(
            player.id,
            'session_cancelled',
            `La session du ${fmtDateFr(session.date)} à ${session.time?.slice(0, 5)} a été annulée.`
          ).catch(() => {});
        }

        if (venueAdmin) {
          await notificationsService.createNotification(
            venueAdmin.id,
            'booking_cancelled',
            `La réservation pour ${venue?.name} du ${fmtDateFr(slot?.date)} a été annulée par le joueur.`
          ).catch(() => {});
        }

        await sendBookingCancellation({ booking, session }).catch(() => {});
      }

      // Notify super_admins (fire-and-forget)
      adminRepo.getSuperAdmins().then((admins) => {
        const msg = `Session annulée le ${fmtDateFr(session.date)} à ${session.time?.slice(0, 5)}`;
        return Promise.allSettled(
          admins.map((a) => notificationsService.createNotification(a.id, 'session_cancelled_admin', msg))
        );
      }).catch(() => {});
    } catch {
      // Non-fatal
    }
  }

  return updated;
}

async function listMySessions(userId) {
  return sessionsRepo.listByCreator(userId);
}

module.exports = { create, list, listMySessions, getById, updateStatus };
