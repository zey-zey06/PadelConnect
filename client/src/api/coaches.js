import client from './client';

/** GET /api/coaches/me → { coach } (coach role only) */
export const getMyCoachProfile = () => client.get('/coaches/me');

/** GET /api/coaches/:id/sessions → { sessions: { upcoming, past } } */
export const getCoachSessions = (id) => client.get(`/coaches/${id}/sessions`);

/** GET /api/coaches → { coaches: [...] } */
export const listCoaches = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.clubId) qs.set('clubId', params.clubId);
  if (params.date)   qs.set('date', params.date);
  if (params.time)   qs.set('time', params.time);
  const query = qs.toString();
  return client.get(`/coaches${query ? `?${query}` : ''}`);
};

/** PUT /api/coaches/:id/availability → { coach } */
export const updateAvailability = (id, availability) =>
  client.put(`/coaches/${id}/availability`, { availability });
