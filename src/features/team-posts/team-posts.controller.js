const { Router } = require('express');
const Joi          = require('joi');
const authenticate = require('../../middleware/authenticate');
const optionalAuth = require('../../middleware/optionalAuth');
const validate     = require('../../middleware/validate');
const svc          = require('./team-posts.service');

const router = Router();

const postSchema = Joi.object({
  type:      Joi.string().valid('photo', 'reel').required(),
  media_url: Joi.string().required(),
  caption:   Joi.string().max(500).allow(null, '').optional(),
});

const commentSchema = Joi.object({
  body: Joi.string().min(1).max(500).required(),
});

// GET /api/team-posts/feed — public feed of photo/reel posts
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
