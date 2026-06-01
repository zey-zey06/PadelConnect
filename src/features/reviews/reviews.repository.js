const db = require('../../db');

/**
 * Get all reviews for a target (club or player), newest first.
 * Joined with user info for reviewer display name + photo.
 */
async function getByTarget(targetId) {
  return db('reviews')
    .join('users', 'reviews.reviewer_id', 'users.id')
    .leftJoin('player_profiles', 'users.id', 'player_profiles.user_id')
    .where('reviews.target_id', targetId)
    .whereNull('users.deleted_at')
    .orderBy('reviews.created_at', 'desc')
    .select(
      'reviews.id',
      'reviews.rating',
      'reviews.comment',
      'reviews.created_at',
      'reviews.target_type',
      'users.id as reviewer_id',
      'users.first_name as reviewer_first_name',
      'users.last_name as reviewer_last_name',
      'player_profiles.photo_url as reviewer_photo_url',
    );
}

/**
 * Returns { average: 4.3 | null, count: 12 } for a target.
 */
async function getAverageRating(targetId) {
  const row = await db('reviews')
    .where('target_id', targetId)
    .avg('rating as avg_rating')
    .count('id as total')
    .first();

  const count = Number(row?.total ?? 0);
  const average = count > 0 ? Math.round(Number(row.avg_rating) * 10) / 10 : null;
  return { average, count };
}

/**
 * Returns true if reviewerId has already reviewed targetId.
 */
async function hasReviewed(reviewerId, targetId) {
  const row = await db('reviews')
    .where({ reviewer_id: reviewerId, target_id: targetId })
    .first();
  return !!row;
}

/**
 * Insert a new review row and return it.
 */
async function create({ reviewer_id, target_id, target_type, rating, comment }) {
  const [result] = await db('reviews')
    .insert({ reviewer_id, target_id, target_type, rating, comment: comment || null })
    .returning('id');

  const rowId = result?.id ?? result;
  return db('reviews').where({ id: rowId }).first();
}

module.exports = { getByTarget, getAverageRating, hasReviewed, create };
