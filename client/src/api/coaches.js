import client from './client';

/** GET /api/coaches/me → { coach } (coach role only) */
export const getMyCoachProfile = () => client.get('/coaches/me');

/** PATCH /api/coaches/me { rate } → { coach } */
export const updateMyCoachProfile = (data) => client.patch('/coaches/me', data);

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

/**
 * POST /api/clubs/:id/coach-invitations
 * Manager sends an invitation to a coach by email.
 * { email } → { invitation }
 */
export const sendClubInvitation = (clubId, email) =>
  client.post(`/clubs/${clubId}/coach-invitations`, { email });

/**
 * GET /api/coach-invitations/pending
 * Coach fetches their pending invitations.
 * → { invitations: [...] }
 */
export const getMyInvitations = () => client.get('/coach-invitations/pending');

/**
 * PATCH /api/coach-invitations/:id
 * Coach accepts or refuses an invitation.
 * { status: 'accepted' | 'refused' } → { ok, status }
 */
export const respondToInvitation = (id, status) =>
  client.patch(`/coach-invitations/${id}`, { status });

/**
 * GET /api/clubs/:id/coach-invitations
 * Manager fetches pending coach invitations for their club.
 * → { invitations: [...] }
 */
export const getClubPendingInvitations = (clubId) =>
  client.get(`/clubs/${clubId}/coach-invitations`);

/**
 * DELETE /api/clubs/:id/coach-invitations/:invId
 * Manager cancels a pending coach invitation.
 * → { ok: true }
 */
export const cancelClubInvitation = (clubId, invitationId) =>
  client.delete(`/clubs/${clubId}/coach-invitations/${invitationId}`);

// ── Ball-picker invitations ───────────────────────────────────────────────────

/** POST /api/clubs/:id/ball-picker-invitations { email } → { invitation } */
export const sendBallPickerInvitation = (clubId, email) =>
  client.post(`/clubs/${clubId}/ball-picker-invitations`, { email });

/** GET /api/clubs/:id/ball-picker-invitations → { invitations } */
export const getClubBallPickerInvitations = (clubId) =>
  client.get(`/clubs/${clubId}/ball-picker-invitations`);

/** DELETE /api/clubs/:id/ball-picker-invitations/:invId → { ok } */
export const cancelBallPickerInvitation = (clubId, invId) =>
  client.delete(`/clubs/${clubId}/ball-picker-invitations/${invId}`);

/** GET /api/ball-picker-invitations/pending → { invitations } */
export const getMyBallPickerInvitations = () =>
  client.get('/ball-picker-invitations/pending');

/** PATCH /api/ball-picker-invitations/:id { status } → { ok, status } */
export const respondToBallPickerInvitation = (id, status) =>
  client.patch(`/ball-picker-invitations/${id}`, { status });
