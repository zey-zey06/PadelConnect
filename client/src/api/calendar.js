import client from './client';

/**
 * GET /api/calendar/me
 * Returns { calendar: { "YYYY-MM-DD": [{ session_id, booking_id, ... }] } }
 */
export const getCalendar = () => client.get('/calendar/me');
