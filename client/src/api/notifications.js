import client from './client';

/** GET /api/notifications → { notifications: [...] } — all (read + unread) */
export const getNotifications = () => client.get('/notifications');

/** GET /api/notifications/unread-count → { count: N } */
export const getUnreadCount = () => client.get('/notifications/unread-count');

/** PATCH /api/notifications/:id/read → { notification } */
export const markAsRead = (id) => client.patch(`/notifications/${id}/read`);
