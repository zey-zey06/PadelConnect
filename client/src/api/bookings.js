import client from './client';

/** GET /api/bookings/me → { bookings: [...] } */
export const getMyBookings = () => client.get('/bookings/me');

/**
 * POST /api/bookings
 * { session_id, venue_slot_id, addons? } → { booking }
 */
export const createBooking = (data) => client.post('/bookings', data);

/** DELETE /api/bookings/:id → { booking } */
export const cancelBooking = (id) => client.delete(`/bookings/${id}`);
