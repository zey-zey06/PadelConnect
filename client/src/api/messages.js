import client from './client';

export const getConversations  = ()                    => client.get('/messages/conversations');
export const getUnreadMsgCount = ()                    => client.get('/messages/unread-count');
export const getMessages       = (userId)              => client.get(`/messages/${userId}`);
export const sendMessage       = (userId, content)     => client.post(`/messages/${userId}`, { content });
export const markAsRead        = (userId)              => client.patch(`/messages/${userId}/read`);
