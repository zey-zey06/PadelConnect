import client from './client';

export const getConversations  = ()                    => client.get('/messages/conversations');
export const getUnreadMsgCount = ()                    => client.get('/messages/unread-count');
export const getMessages       = (userId)              => client.get(`/messages/${userId}`);
export const sendMessage       = (userId, content)     => client.post(`/messages/${userId}`, { content });
export const markAsRead        = (userId)              => client.patch(`/messages/${userId}/read`);

/** Send a share card (session_share or slot_share) to one contact. */
export const sendShareMessage = (userId, type, metadata) =>
  client.post(`/messages/${userId}`, {
    content:  type === 'session_share' ? '📅 Session partagée' : '🎾 Créneau partagé',
    type,
    metadata,
  });
