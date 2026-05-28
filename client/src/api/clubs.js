import client from './client';

/** GET /api/clubs/featured → { clubs: [...] }  (public — no auth required) */
export const listFeaturedClubs = () => client.get('/clubs/featured');

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

// ── Favorites ────────────────────────────────────────────────────────────────
export const getMyFavoriteClubs   = ()   => client.get('/clubs/my/favorites');
export const getClubFavoriteStatus = (id) => client.get(`/clubs/${id}/favorite`);
export const toggleClubFavorite   = (id) => client.post(`/clubs/${id}/favorite`);

// ── Subscriptions ────────────────────────────────────────────────────────────
export const getClubSubscriptionStatus = (id) => client.get(`/clubs/${id}/subscription`);
export const toggleClubSubscription    = (id) => client.post(`/clubs/${id}/subscription`);

// ── Posts ────────────────────────────────────────────────────────────────────
export const getClubPosts   = (id)             => client.get(`/clubs/${id}/posts`);
export const createClubPost = (id, data)       => client.post(`/clubs/${id}/posts`, data);
export const deleteClubPost = (id, postId)     => client.delete(`/clubs/${id}/posts/${postId}`);

// ── Subscribers ──────────────────────────────────────────────────────────
export const getClubSubscribers = (id) => client.get(`/clubs/${id}/subscribers`);

// ── Club Messages ────────────────────────────────────────────────────────
export const getClubMessages = (id) => client.get(`/clubs/${id}/messages`);
export const sendClubMessage = (id, data) => client.post(`/clubs/${id}/messages`, data);
