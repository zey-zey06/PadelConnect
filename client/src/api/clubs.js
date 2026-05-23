import client from './client';

/** GET /api/clubs → { clubs: [...] } */
export const listClubs = () => client.get('/clubs');

/** GET /api/clubs/:id → { club } */
export const getClub = (id) => client.get(`/clubs/${id}`);

/** GET /api/clubs/:id/venues → { venues: [...] } */
export const getClubVenues = (id) => client.get(`/clubs/${id}/venues`);

/** GET /api/clubs/:id/coaches → { coaches: [...] } */
export const getClubCoaches = (id) => client.get(`/clubs/${id}/coaches`);

/** GET /api/clubs/:id/ball-pickers → { ballPickers: [...] } */
export const getClubBallPickers = (id) => client.get(`/clubs/${id}/ball-pickers`);

/** GET /api/clubs/:id/public → { club, venues } */
export const getPublicClub = (id) => client.get(`/clubs/${id}/public`);

/** GET /api/clubs/:id/slots?date=YYYY-MM-DD → { date, venues: [{ id, name, slots }] } */
export const getClubSlots = (id, date) =>
  client.get(`/clubs/${id}/slots${date ? `?date=${date}` : ''}`);
