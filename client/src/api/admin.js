import client from './client';

/** GET /api/admin/dashboard → { stats } */
export const getDashboard = () => client.get('/admin/dashboard');

/** GET /api/admin/activity → { recentUsers, recentBookings } */
export const getAdminActivity = () => client.get('/admin/activity');

/** GET /api/admin/users?status=&role= → { users: [...] } */
export const listUsers = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.role)   qs.set('role', params.role);
  const query = qs.toString();
  return client.get(`/admin/users${query ? `?${query}` : ''}`);
};

/** PATCH /api/admin/users/:id/status → { user } */
export const updateUserStatus = (id, status) =>
  client.patch(`/admin/users/${id}/status`, { status });

/** GET /api/admin/sessions?status= → { sessions: [...] } */
export const listAdminSessions = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return client.get(`/admin/sessions${query ? `?${query}` : ''}`);
};

/** DELETE /api/admin/sessions/:id → { ok: true } */
export const deleteAdminSession = (id) => client.delete(`/admin/sessions/${id}`);

/** GET /api/admin/clubs → { clubs: [...] } */
export const listAdminClubs = () => client.get('/admin/clubs');

/** PATCH /api/admin/clubs/:id/status → { club } */
export const updateClubStatus = (id, status) =>
  client.patch(`/admin/clubs/${id}/status`, { status });

/** GET /api/admin/bookings?date= → { bookings: [...] } */
export const listAdminBookings = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  const query = qs.toString();
  return client.get(`/admin/bookings${query ? `?${query}` : ''}`);
};

/** GET /api/admin/sanctions?type= → { sanctions: [...] } */
export const listAdminSanctions = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  const query = qs.toString();
  return client.get(`/admin/sanctions${query ? `?${query}` : ''}`);
};

/** PATCH /api/admin/sanctions/:id/paid → { sanction } */
export const markSanctionPaid = (id) => client.patch(`/admin/sanctions/${id}/paid`);

/** DELETE /api/admin/sanctions/:id → { ok: true } (lift ban) */
export const liftSanction = (id) => client.delete(`/admin/sanctions/${id}`);

/** PATCH /api/admin/clubs/:id/validate → { club } */
export const validateClub = (id) => client.patch(`/admin/clubs/${id}/validate`);

/** DELETE /api/admin/users/:id → { ok: true } */
export const deleteAdminUser = (id) => client.delete(`/admin/users/${id}`);
