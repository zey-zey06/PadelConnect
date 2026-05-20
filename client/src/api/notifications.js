import client from './client';

/** GET /api/notifications → { notifications: [...] } */
export const getNotifications = () => client.get('/notifications');

/** PATCH /api/notifications/:id/read → { notification } */
export const markAsRead = (id) => client.patch(`/notifications/${id}/read`);
