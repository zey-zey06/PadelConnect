const { Router } = require('express');
const Joi          = require('joi');
const authenticate = require('../../middleware/authenticate');
const optionalAuth = require('../../middleware/optionalAuth');
const validate     = require('../../middleware/validate');
const svc          = require('./team-posts.service');
const { scanTournamentPoster } = require('../../ai/scan-tournament-poster');

const router = Router();

const postSchema = Joi.object({
  type:      Joi.string().valid('photo', 'reel', 'tournament').required(),
  media_url: Joi.string().required(),
  caption:   Joi.string().max(500).allow(null, '').optional(),
  metadata:  Joi.object().unknown(true).allow(null).optional(),
});

const commentSchema = Joi.object({
  body: Joi.string().min(1).max(500).required(),
});

// POST /api/team-posts/scan — scan a tournament poster image with Groq vision
// Must be registered BEFORE /:teamId to avoid route conflict
router.post('/scan', authenticate, async (req, res, next) => {
  try {
    const { image_url } = req.body;
    if (!image_url) return res.status(422).json({ status: 422, error: 'Unprocessable Entity', message: 'image_url est requis.' });
    const metadata = await scanTournamentPoster(image_url);
    res.json({ metadata });
  } catch (err) { next(err); }
});

// GET /api/team-posts/feed — public feed of posts
router.get('/feed', optionalAuth, async (req, res, next) => {
  try {
    const posts = await svc.getFeedPosts();
    res.json({ posts });
  } catch (err) { next(err); }
});

// POST /api/team-posts/:teamId — create post (admin/manager)
router.post('/:teamId', authenticate, validate(postSchema), async (req, res, next) => {
  try {
    const post = await svc.createPost(req.user.sub, req.params.teamId, req.body);
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

// POST /api/team-posts/:id/like — toggle like (authenticated)
router.post('/:id/like', authenticate, async (req, res, next) => {
  try {
    const result = await svc.toggleLike(req.user.sub, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/team-posts/:id/comments — public
router.get('/:id/comments', async (req, res, next) => {
  try {
    const comments = await svc.getComments(req.params.id);
    res.json({ comments });
  } catch (err) { next(err); }
});

// POST /api/team-posts/:id/comments — authenticated
router.post('/:id/comments', authenticate, validate(commentSchema), async (req, res, next) => {
  try {
    const comment = await svc.addComment(req.user.sub, req.params.id, req.body.body);
    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

module.exports = router;
