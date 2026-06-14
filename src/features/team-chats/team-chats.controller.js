const { Router } = require('express');
const Joi          = require('joi');
const authenticate = require('../../middleware/authenticate');
const validate     = require('../../middleware/validate');
const service      = require('./team-chats.service');

const router = Router();

const chatSchema = Joi.object({
  team_id: Joi.string().uuid().required(),
  club_id: Joi.string().uuid().required(),
});

const msgSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
});

// GET /api/team-chats/my
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const chats = await service.getMyChats(req.user);
    res.json({ chats });
  } catch (err) { next(err); }
});

// POST /api/team-chats
router.post('/', authenticate, validate(chatSchema), async (req, res, next) => {
  try {
    const chat = await service.getOrCreateChat(req.user, req.body);
    res.status(200).json({ chat });
  } catch (err) { next(err); }
});

// GET /api/team-chats/:chatId/messages
router.get('/:chatId/messages', authenticate, async (req, res, next) => {
  try {
    const messages = await service.getMessages(req.user, req.params.chatId);
    res.json({ messages });
  } catch (err) { next(err); }
});

// POST /api/team-chats/:chatId/messages
router.post('/:chatId/messages', authenticate, validate(msgSchema), async (req, res, next) => {
  try {
    const message = await service.sendMessage(req.user, req.params.chatId, req.body.content);
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

module.exports = router;
