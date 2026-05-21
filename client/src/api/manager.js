import client from './client';

// ── Club ──────────────────────────────────────────────────────────────────────
/** GET /api/clubs/:id → { club } */
export const getMyClub   = (clubId) => client.get(`/clubs/${clubId}`);

/** GET /api/clubs/:id/venues → { venues: [...] } */
export const getMyVenues = (clubId) => client.get(`/clubs/${clubId}/venues`);

/** POST /api/clubs/:id/venues → { venue } */
export const addVenue = (clubId, data) => client.post(`/clubs/${clubId}/venues`, data);

// ── Venue slots ───────────────────────────────────────────────────────────────
/** GET /api/venues/:id/slots?date=YYYY-MM-DD → { slots: [...] } */
export const getVenueSlots = (venueId, params = {}) => {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  const q = qs.toString();
  return client.get(`/venues/${venueId}/slots${q ? `?${q}` : ''}`);
};

/** POST /api/venues/:id/slots → { slot } */
export const addSlot = (venueId, data) => client.post(`/venues/${venueId}/slots`, data);

/** PATCH /api/venues/:id/slots/:slotId → { slot } */
export const updateSlot = (venueId, slotId, data) =>
  client.patch(`/venues/${venueId}/slots/${slotId}`, data);

/**
 * DELETE /api/venues/:id/slots/:slotId → { slot }
 * Soft-deletes the slot (status → cancelled), cancels any active booking,
 * and notifies the affected player.
 */
export const cancelSlot = (venueId, slotId) =>
  client.delete(`/venues/${venueId}/slots/${slotId}`);
