import client from './client';

/**
 * POST /api/reports
 * { reported_user_id, reason, description? } → { ok: true }
 */
export const reportUser = (data) => client.post('/reports', data);
