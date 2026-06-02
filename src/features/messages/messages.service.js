const messagesRepo         = require('./messages.repository');
const notificationsService = require('../notifications/notifications.service');
const db                   = require('../../db');

async function getConversations(userId) {
  return messagesRepo.getConversations(userId);
}

async function getMessages(userId, partnerId) {
  return messagesRepo.getMessagesBetween(userId, partnerId);
}

async function sendMessage(senderId, receiverId, content, type = 'text', metadata = null) {
  const message = await messagesRepo.createMessage(senderId, receiverId, content.trim(), type, metadata);

  // Push notification to receiver — fire-and-forget, non-fatal
  try {
    const sender = await db('users').where({ id: senderId }).select('first_name', 'last_name', 'username').first();
    const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(' ')
      || sender?.username || 'Quelqu\'un';
    notificationsService.createNotification(
      receiverId,
      'new_message',
      `${senderName} vous a envoyé un message.`,
      senderId,
    ).catch(() => {});
  } catch { /* non-fatal */ }

  return message;
}

async function markAsRead(userId, partnerId) {
  return messagesRepo.markAsRead(userId, partnerId);
}

async function getUnreadCount(userId) {
  return messagesRepo.getUnreadCount(userId);
}

module.exports = { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount };
