import client from './client';

/**
 * GET /api/sessions?status=open&date=...
 * Returns { sessions: [...] }
 */
export const listSessions = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status)   qs.set('status',    params.status);
  if (params.date)     qs.set('date',      params.date);
  if (params.level_min != null) qs.set('level_min', String(params.level_min));
  if (params.level_max != null) qs.set('level_max', String(params.level_max));
  if (params.gender)   qs.set('gender',    params.gender);
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

/**
 * POST /api/sessions/:id/requests { role: 'coach', coach_user_id }
 * Creator invites a coach to the session.
 */
export const inviteCoach = (sessionId, coachUserId) =>
  client.post(`/sessions/${sessionId}/requests`, { role: 'coach', coach_user_id: coachUserId });

/**
 * POST /api/sessions/:id/invite-player { player_user_id }
 * Creator invites an AI-suggested player — sends them a notification.
 */
export const invitePlayer = (sessionId, playerUserId) =>
  client.post(`/sessions/${sessionId}/invite-player`, { player_user_id: playerUserId });

/** GET /api/sessions/my-requests → { requests: [{ session_id, status }] } */
export const getMySessionRequests = () => client.get('/sessions/my-requests');

/** GET /api/sessions/history → { sessions: [...] } — all sessions user created or requested */
export const getSessionHistory = () => client.get('/sessions/history');

/** PUT /api/sessions/:id { date, time, end_time, max_players, preferences } → { session } */
export const updateSession = (id, data) => client.put(`/sessions/${id}`, data);

/** GET /api/sessions/:id/participants → { participants: [...] } */
export const getSessionParticipants = (id) => client.get(`/sessions/${id}/participants`);

/** DELETE /api/sessions/:id/participants/:userId → { ok: true } */
export const removeParticipant = (sessionId, userId) =>
  client.delete(`/sessions/${sessionId}/participants/${userId}`);

/** POST /api/sessions/:id/ratings → { rating } */
export const rateSession = (id, data) => client.post(`/sessions/${id}/ratings`, data);

/** GET /api/sessions/:id/ratings → { count, organisation, niveau, ambiance, average } */
export const getSessionRatings = (id) => client.get(`/sessions/${id}/ratings`);
