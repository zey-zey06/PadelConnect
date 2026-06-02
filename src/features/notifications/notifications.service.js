const notificationsRepo = require('./notifications.repository');
const pushService       = require('../push/push.service');

const PUSH_TITLES = {
  friend_request:    "Demande d'ami 👋",
  session_request:   'Demande de session 🎾',
  session_invite:    'Invitation de session',
  request_accepted:  'Demande acceptée ! 🎉',
  request_refused:   'Demande refusée',
  session_complete:  'Session complète 🎾',
  booking_confirmed: 'Réservation confirmée ✅',
  club_post:         'Nouvelle publication',
  new_message:       'Nouveau message 💬',
  participant_removed: 'Retiré d\'une session',
};

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Fire-and-forget notification creation.
 * Errors are caught internally — never blocks the caller.
 */
async function createNotification(userId, type, message, actorId = null, metadata = null) {
  try {
    const notif = await notificationsRepo.create({
      user_id: userId, type, message,
      actor_id: actorId || undefined,
      metadata: metadata || undefined,
    });

    // Fire-and-forget push notification for relevant types
    if (PUSH_TITLES[type]) {
      pushService.sendPushToUser(userId, {
        title: PUSH_TITLES[type],
        body:  message ?? '',
        type,
        url:   '/',
      }).catch(() => {});
    }

    return notif;
  } catch {
    // Non-fatal: notification failure must never block business operations
  }
}

async function getAll(userId) {
  return notificationsRepo.getAll(userId);
}

async function getUnreadCount(userId) {
  const rows = await notificationsRepo.getUnread(userId);
  return rows.length;
}

async function getUnread(userId) {
  return notificationsRepo.getUnread(userId);
}

async function markAsRead(notificationId, userId) {
  const notification = await notificationsRepo.getById(notificationId);
  if (!notification) throw makeError(404, 'Notification introuvable.');
  if (notification.user_id !== userId) throw makeError(403, 'Accès refusé.');
  return notificationsRepo.markAsRead(notificationId);
}

module.exports = { createNotification, getAll, getUnreadCount, getUnread, markAsRead };
