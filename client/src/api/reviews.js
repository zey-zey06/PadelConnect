import client from './client';

/**
 * GET /api/reviews/:targetId
 * Returns { reviews: [...], average: 4.3 | null, count: 12 }
 */
export const getReviews = (targetId) => client.get(`/reviews/${targetId}`);

/**
 * POST /api/reviews
 * Body: { target_id, target_type, rating, comment? }
 * Returns { review }
 */
export const createReview = (data) => client.post('/reviews', data);
