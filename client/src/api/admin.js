import client from './client';

/** GET /api/admin/dashboard → { stats } */
export const getDashboard = () => client.get('/admin/dashboard');

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

/** GET /api/admin/clubs → { clubs: [...] } */
export const listAdminClubs = () => client.get('/admin/clubs');

/** PATCH /api/admin/clubs/:id/status → { club } */
export const updateClubStatus = (id, status) =>
  client.patch(`/admin/clubs/${id}/status`, { status });

/** GET /api/admin/sessions?status= → { sessions: [...] } */
export const listAdminSessions = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return client.get(`/admin/sessions${query ? `?${query}` : ''}`);
};
