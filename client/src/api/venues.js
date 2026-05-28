import client from './client';

/** GET /api/venues/:id/slots?date=... → { slots: [...] } */
export const getVenueSlots = (venueId, params = {}) => {
  const qs = new URLSearchParams();
  if (params.date)   qs.set('date', params.date);
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return client.get(`/venues/${venueId}/slots${query ? `?${query}` : ''}`);
};

/** POST /api/venues/:id/slots → { slot } */
export const addSlot = (venueId, data) => client.post(`/venues/${venueId}/slots`, data);

/** PATCH /api/venues/:id/slots/:slotId → { slot } */
export const updateSlot = (venueId, slotId, data) =>
  client.patch(`/venues/${venueId}/slots/${slotId}`, data);

/** DELETE /api/venues/:id/slots/:slotId → { slot } */
export const deleteSlot = (venueId, slotId) =>
  client.delete(`/venues/${venueId}/slots/${slotId}`);

/** DELETE /api/venues/:id → { venue } — soft delete venue + cancel all future slots */
export const deleteVenue = (venueId) =>
  client.delete(`/venues/${venueId}`);
