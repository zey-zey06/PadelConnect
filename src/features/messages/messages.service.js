const messagesRepo = require('./messages.repository');

async function getConversations(userId) {
  return messagesRepo.getConversations(userId);
}

async function getMessages(userId, partnerId) {
  return messagesRepo.getMessagesBetween(userId, partnerId);
}

async function sendMessage(senderId, receiverId, content) {
  return messagesRepo.createMessage(senderId, receiverId, content.trim());
}

async function markAsRead(userId, partnerId) {
  return messagesRepo.markAsRead(userId, partnerId);
}

async function getUnreadCount(userId) {
  return messagesRepo.getUnreadCount(userId);
}

module.exports = { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount };
