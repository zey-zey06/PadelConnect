const { Router } = require('express');
const Joi              = require('joi');
const authenticate     = require('../../middleware/authenticate');
const validate         = require('../../middleware/validate');
const messagesService  = require('./messages.service');

const router = Router();

const sendSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  type:     Joi.string().valid('text', 'session_share', 'slot_share').default('text'),
  metadata: Joi.object().unknown(true).optional(),
});

// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const conversations = await messagesService.getConversations(req.user.sub);
    res.json({ conversations });
  } catch (err) { next(err); }
});

// GET /api/messages/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await messagesService.getUnreadCount(req.user.sub);
    res.json({ count });
  } catch (err) { next(err); }
});

// GET /api/messages/:userId
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const messages = await messagesService.getMessages(req.user.sub, req.params.userId);
    res.json({ messages });
  } catch (err) { next(err); }
});

// POST /api/messages/:userId
router.post('/:userId', authenticate, validate(sendSchema), async (req, res, next) => {
  try {
    const { content, type = 'text', metadata = null } = req.body;
    const message = await messagesService.sendMessage(req.user.sub, req.params.userId, content, type, metadata);
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

// PATCH /api/messages/:userId/read
router.patch('/:userId/read', authenticate, async (req, res, next) => {
  try {
    await messagesService.markAsRead(req.user.sub, req.params.userId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
