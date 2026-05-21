import client from './client';

/** GET /api/clubs → { clubs: [...] } */
export const listClubs = () => client.get('/clubs');

/** GET /api/clubs/:id → { club } */
export const getClub = (id) => client.get(`/clubs/${id}`);

/** GET /api/clubs/:id/venues → { venues: [...] } */
export const getClubVenues = (id) => client.get(`/clubs/${id}/venues`);

/** GET /api/clubs/:id/coaches → { coaches: [...] } */
export const getClubCoaches = (id) => client.get(`/clubs/${id}/coaches`);
