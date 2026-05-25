import client from './client';

/**
 * GET /api/search?q=:query
 * → { players: [{user_id, first_name, last_name, email, level, photo_url}],
 *     clubs:   [{id, name, logo_url, venue_count}] }
 * Max 5 players + 5 clubs. Requires authentication.
 */
export const search = (query) =>
  client.get(`/search?q=${encodeURIComponent(query)}`);
