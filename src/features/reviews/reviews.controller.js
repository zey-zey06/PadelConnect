const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const reviewsRepo = require('./reviews.repository');

const router = Router();

const createSchema = Joi.object({
  target_id:   Joi.string().uuid().required(),
  target_type: Joi.string().valid('club', 'player').required(),
  rating:      Joi.number().integer().min(1).max(5).required(),
  comment:     Joi.string().max(500).optional().allow('', null),
});

/**
 * GET /api/reviews/:targetId
 * Public — list reviews + average for a club or player.
 */
router.get('/:targetId', async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const [reviews, avgData] = await Promise.all([
      reviewsRepo.getByTarget(targetId),
      reviewsRepo.getAverageRating(targetId),
    ]);
    res.json({ reviews, average: avgData.average, count: avgData.count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reviews
 * Authenticated — create a review.
 * Prevents self-review and duplicate reviews.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(422).json({
        status: 422, error: 'Validation Error', message: error.details[0].message,
      });
    }

    // Prevent self-review
    if (value.target_id === req.user.sub) {
      return res.status(400).json({
        status: 400, error: 'Bad Request', message: 'Vous ne pouvez pas vous noter vous-même.',
      });
    }

    // Prevent duplicate review
    const already = await reviewsRepo.hasReviewed(req.user.sub, value.target_id);
    if (already) {
      return res.status(409).json({
        status: 409, error: 'Conflict', message: 'Vous avez déjà laissé un avis pour cette cible.',
      });
    }

    const review = await reviewsRepo.create({ reviewer_id: req.user.sub, ...value });
    return res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
