const { Router }  = require('express');
const authenticate = require('../../middleware/authenticate');
const { getFeed }  = require('./feed.service');

const router = Router();

// GET /api/feed — personalised home feed for authenticated user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const result = await getFeed(req.user.sub, { page, limit });
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
