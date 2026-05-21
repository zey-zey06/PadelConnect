import client from './client';

/**
 * GET /api/sessions?status=open&date=...
 * Returns { sessions: [...] }
 */
export const listSessions = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.date)   qs.set('date',   params.date);
  if (params.level_min != null) qs.set('level_min', String(params.level_min));
  if (params.level_max != null) qs.set('level_max', String(params.level_max));
  const query = qs.toString();
  return client.get(`/sessions${query ? `?${query}` : ''}`);
};

/** GET /api/sessions/:id → { session } */
export const getSession = (id) => client.get(`/sessions/${id}`);

/** POST /api/sessions → { session } */
export const createSession = (data) => client.post('/sessions', data);

/** POST /api/sessions/:id/requests → { request } */
export const requestJoin = (sessionId) => client.post(`/sessions/${sessionId}/requests`);

/** GET /api/sessions/:id/requests → { requests: [...] } */
export const getSessionRequests = (sessionId) => client.get(`/sessions/${sessionId}/requests`);

/** PATCH /api/sessions/:id/requests/:requestId → { request } */
export const respondToRequest = (sessionId, requestId, status) =>
  client.patch(`/sessions/${sessionId}/requests/${requestId}`, { status });

/** GET /api/sessions/my → { sessions: [...] } — sessions created by current user */
export const getMySessions = () => client.get('/sessions/my');

/** PATCH /api/sessions/:id/status { status: 'cancelled' } → { session } */
export const cancelSession = (sessionId) =>
  client.patch(`/sessions/${sessionId}/status`, { status: 'cancelled' });
