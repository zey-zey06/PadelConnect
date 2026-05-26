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
async function createNotification(userId, type, message, actorId = null) {
  try {
    return await notificationsRepo.create({ user_id: userId, type, message, actor_id: actorId || undefined });
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
