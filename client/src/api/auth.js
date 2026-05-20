import client from './client';

/**
 * POST /api/auth/signup
 * { email, password, role? }  →  { user }
 */
export const signup = (data) => client.post('/auth/signup', data);

/**
 * POST /api/auth/login
 * { email, password }  →  { user }
 * Sets httpOnly cookie on success.
 */
export const login = (data) => client.post('/auth/login', data);

/**
 * POST /api/auth/logout
 * Clears the token cookie.
 */
export const logout = () => client.post('/auth/logout');

/**
 * GET /api/auth/me  (requires auth cookie)
 * →  { user }
 */
export const me = () => client.get('/auth/me');

/**
 * GET /api/auth/verify-email?token=
 * →  { message, user }
 */
export const verifyEmail = (token) =>
  client.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
