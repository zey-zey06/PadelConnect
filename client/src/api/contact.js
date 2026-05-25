import client from './client';

/**
 * POST /api/contact
 * { name, email, subject, message } → { ok: true }
 */
export const sendContactMessage = (data) => client.post('/contact', data);
