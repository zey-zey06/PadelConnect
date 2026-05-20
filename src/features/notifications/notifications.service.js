const notificationsRepo = require('./notifications.repository');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Fire-and-forget notification creation.
 * Errors are caught internally — never blocks the caller.
 */
async function createNotification(userId, type, message) {
  try {
    return await notificationsRepo.create({ user_id: userId, type, message });
  } catch {
    // Non-fatal: notification failure must never block business operations
  }
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

module.exports = { createNotification, getUnread, markAsRead };
