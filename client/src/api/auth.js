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

/**
 * PATCH /api/auth/me
 * { first_name, last_name } → { user }
 */
export const updateMe = (data) => client.patch('/auth/me', data);

/**
 * PATCH /api/auth/password
 * { current_password, new_password } → { ok: true }
 */
export const changePassword = (data) => client.patch('/auth/password', data);

/**
 * DELETE /api/auth/me
 * Soft-deletes the current user's account and clears the session cookie.
 */
export const deleteAccount = () => client.delete('/auth/me');

/**
 * POST /api/auth/resend-verification
 * { email } → { ok: true }
 */
export const resendVerification = (email) => client.post('/auth/resend-verification', { email });

/**
 * POST /api/auth/verify-otp
 * { email, code } → { user } + sets JWT cookie
 */
export const verifyOtp = (email, code) => client.post('/auth/verify-otp', { email, code });

/**
 * POST /api/auth/forgot-password
 * { email } → { ok: true }
 */
export const forgotPassword = (email) => client.post('/auth/forgot-password', { email });

/**
 * POST /api/auth/reset-password
 * { email, code, newPassword } → { ok: true }
 */
export const resetPassword = (email, code, newPassword) =>
  client.post('/auth/reset-password', { email, code, newPassword });
