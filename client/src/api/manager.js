import client from './client';

// ── Manager dashboard ─────────────────────────────────────────────────────────
/**
 * GET /api/manager/dashboard
 * → { stats: { total_venues, bookings_today, bookings_week, revenue_today } }
 */
export const getManagerDashboard = () => client.get('/manager/dashboard');

// ── Club ──────────────────────────────────────────────────────────────────────
/** POST /api/clubs → { club }  (also refreshes JWT cookie with new org_id) */
export const createClub = (data) => client.post('/clubs', data);

/** GET /api/clubs/:id → { club } */
export const getMyClub = (clubId) => client.get(`/clubs/${clubId}`);

/** PATCH /api/clubs/:id → { club } */
export const updateClub = (clubId, data) => client.patch(`/clubs/${clubId}`, data);

function _multipartPost(url, fieldName, file) {
  const form = new FormData();
  form.append(fieldName, file);
  return fetch(url, { method: 'POST', credentials: 'include', body: form }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.message || 'Erreur upload.'); err.status = res.status; throw err; }
    return data;
  });
}

/** POST /api/clubs/:id/logo  (multipart, field: logo) → { club } */
export const uploadClubLogo  = (clubId, file) => _multipartPost(`/api/clubs/${clubId}/logo`,   'logo',  file);

/** POST /api/clubs/:id/cover (multipart, field: cover) → { club } */
export const uploadClubCover = (clubId, file) => _multipartPost(`/api/clubs/${clubId}/cover`,  'cover', file);

/** POST /api/clubs/:id/photos (multipart, field: photo) → { club } */
export const uploadClubPhoto = (clubId, file) => _multipartPost(`/api/clubs/${clubId}/photos`, 'photo', file);

/** DELETE /api/clubs/:id/photos { url } → { club } */
export const deleteClubPhoto = (clubId, url) => client.delete(`/clubs/${clubId}/photos`, { body: { url } });

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

/** PATCH /api/venues/:id/slots/bulk-price — update price for all slots matching start/end time */
export const bulkUpdateSlotPrice = (venueId, startTime, endTime, price) =>
  client.patch(`/venues/${venueId}/slots/bulk-price`, { start_time: startTime, end_time: endTime, price });

/** POST /api/venues/:id/slots/generate — auto-fill missing default slots for next 30 days */
export const fillVenueSlots = (venueId) => client.post(`/venues/${venueId}/slots/generate`);
