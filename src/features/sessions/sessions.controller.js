const { Router } = require('express');
const Joi = require('joi');

const authenticate    = require('../../middleware/authenticate');
const sessionsService = require('./sessions.service');
const messagesRepo    = require('./messages.repository');
const scoresRepo      = require('./scores.repository');
const profileRepo     = require('../profiles/profile.repository');
const notifService    = require('../notifications/notifications.service');
const db              = require('../../db');

const createSessionSchema = Joi.object({
  date:        Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  time:        Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
  end_time:    Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional().allow(null, ''),
  max_players: Joi.number().integer().min(2).max(4).required(),
  preferences: Joi.object().optional(),
  location:    Joi.string().max(200).optional().allow(null, ''),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'complete', 'cancelled').required(),
});

const updateSessionSchema = Joi.object({
  date:        Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  time:        Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
  end_time:    Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional().allow(null, ''),
  max_players: Joi.number().integer().min(2).max(4).required(),
  location:    Joi.string().max(200).optional().allow(null, ''),
  preferences: Joi.object({
    level_min: Joi.number().integer().min(1).max(7).allow(null).optional(),
    gender:    Joi.string().valid('mixed', 'women', 'men').allow(null).optional(),
  }).optional(),
});

async function createHandler(req, res, next) {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const session = await sessionsService.create(req.user.sub, value);
    return res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

async function listHandler(req, res, next) {
  try {
    const filters = {};
    if (req.query.date)   filters.date      = req.query.date;
    if (req.query.status) filters.status    = req.query.status;
    if (req.query.level_min) filters.level_min = parseInt(req.query.level_min, 10);
    if (req.query.level_max) filters.level_max = parseInt(req.query.level_max, 10);
    if (req.query.gender) filters.gender = req.query.gender;

    const sessions = await sessionsService.list(filters);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const session = await sessionsService.getById(req.params.id);
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

async function updateStatusHandler(req, res, next) {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const session = await sessionsService.updateStatus(req.params.id, req.user.sub, value.status);
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

async function listMySessionsHandler(req, res, next) {
  try {
    const sessions = await sessionsService.listMySessions(req.user.sub);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function listMyRequestsHandler(req, res, next) {
  try {
    const requests = await sessionsService.getMyRequests(req.user.sub);
    return res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function historyHandler(req, res, next) {
  try {
    const sessions = await sessionsService.getHistory(req.user.sub);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function getParticipantsHandler(req, res, next) {
  try {
    const participants = await sessionsService.getSessionParticipants(req.params.id);
    return res.json({ participants });
  } catch (err) {
    next(err);
  }
}

async function updateSessionHandler(req, res, next) {
  try {
    const { error, value } = updateSessionSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const session = await sessionsService.updateSession(req.params.id, req.user.sub, value);
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function isSessionParticipant(sessionId, userId) {
  const session = await db('sessions').where({ id: sessionId }).whereNull('deleted_at').first('creator_id');
  if (!session) return false;
  if (session.creator_id === userId) return true;
  const req = await db('session_requests')
    .where({ session_id: sessionId, player_id: userId, status: 'accepted' })
    .whereNull('deleted_at')
    .first('id');
  return !!req;
}

// ── Session messages ──────────────────────────────────────────────────────────
async function getMessagesHandler(req, res, next) {
  try {
    const userId    = req.user.sub;
    const sessionId = req.params.id;
    if (!(await isSessionParticipant(sessionId, userId))) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Accès réservé aux participants.' });
    }
    const messages = await messagesRepo.getMessages(sessionId);
    return res.json({ messages });
  } catch (err) { next(err); }
}

const messageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
});

async function postMessageHandler(req, res, next) {
  try {
    const userId    = req.user.sub;
    const sessionId = req.params.id;
    if (!(await isSessionParticipant(sessionId, userId))) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Accès réservé aux participants.' });
    }
    const { error, value } = messageSchema.validate(req.body ?? {});
    if (error) return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    const message = await messagesRepo.createMessage(sessionId, userId, value.content);
    return res.status(201).json({ message });
  } catch (err) { next(err); }
}

// ── Session score ─────────────────────────────────────────────────────────────
const scoreSchema = Joi.object({
  score_my_team:  Joi.number().integer().min(0).max(99).required(),
  score_opponent: Joi.number().integer().min(0).max(99).required(),
  winner:         Joi.string().valid('my_team', 'opponent').required(),
});

async function getScoreHandler(req, res, next) {
  try {
    const score = await scoresRepo.getScore(req.params.id);
    return res.json({ score: score ?? null });
  } catch (err) { next(err); }
}

async function postScoreHandler(req, res, next) {
  try {
    const userId    = req.user.sub;
    const sessionId = req.params.id;

    const session = await db('sessions').where({ id: sessionId }).whereNull('deleted_at').first();
    if (!session) return next(makeError(404, 'Session introuvable.'));
    if (session.creator_id !== userId) return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Seul l\'organisateur peut saisir le score.' });

    const sessionDate = new Date(session.date.toString().slice(0, 10) + 'T' + (session.end_time ?? session.time ?? '23:59'));
    if (sessionDate > new Date()) return res.status(422).json({ status: 422, error: 'Validation Error', message: 'La session n\'est pas encore terminée.' });

    const existing = await scoresRepo.getScore(sessionId);
    if (existing) return res.status(409).json({ status: 409, error: 'Conflict', message: 'Score déjà saisi pour cette session.' });

    const { error, value } = scoreSchema.validate(req.body ?? {});
    if (error) return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });

    const score = await scoresRepo.createScore(sessionId, userId, value);

    // Award XP to participants — creator vs others
    const participants = await db('session_requests')
      .where({ session_id: sessionId, status: 'accepted' })
      .whereNull('deleted_at')
      .pluck('player_id');

    const allPlayerIds = [userId, ...participants];
    const winXP  = 50;
    const loseXP = 20;

    await Promise.allSettled(allPlayerIds.map((pid) => {
      const isCreator = pid === userId;
      const xp = (value.winner === 'my_team') === isCreator ? winXP : loseXP;
      return profileRepo.addXP(pid, xp).catch(() => {});
    }));

    // Notify participants of score
    const sessionLabel = `${session.date?.toString().slice(0, 10)} à ${session.time?.slice(0, 5)}`;
    await Promise.allSettled(participants.map((pid) =>
      notifService.createNotification(pid, 'session_ended', `Score de votre session du ${sessionLabel} : ${value.score_my_team} – ${value.score_opponent}`)
    ));

    return res.status(201).json({ score });
  } catch (err) { next(err); }
}

// ── Session feedback ──────────────────────────────────────────────────────────
const feedbackSchema = Joi.object({
  emoji:   Joi.string().valid('super', 'correct', 'decevant').required(),
  comment: Joi.string().trim().max(150).optional().allow('', null),
});

async function postFeedbackHandler(req, res, next) {
  try {
    const userId    = req.user.sub;
    const sessionId = req.params.id;

    const session = await db('sessions').where({ id: sessionId }).whereNull('deleted_at').first();
    if (!session) return next(makeError(404, 'Session introuvable.'));
    if (session.creator_id === userId) return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Le feedback est pour les participants.' });

    const accepted = await db('session_requests')
      .where({ session_id: sessionId, player_id: userId, status: 'accepted' })
      .whereNull('deleted_at')
      .first('id');
    if (!accepted) return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Réservé aux participants confirmés.' });

    const { error, value } = feedbackSchema.validate(req.body ?? {});
    if (error) return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });

    const existing = await db('session_feedback').where({ session_id: sessionId, user_id: userId }).first('id');
    if (existing) return res.status(409).json({ status: 409, error: 'Conflict', message: 'Feedback déjà envoyé.' });

    const [fb] = await db('session_feedback')
      .insert({ session_id: sessionId, user_id: userId, emoji: value.emoji, comment: value.comment ?? null })
      .returning('*');

    return res.status(201).json({ feedback: fb });
  } catch (err) { next(err); }
}

async function getMyFeedbackHandler(req, res, next) {
  try {
    const fb = await db('session_feedback')
      .where({ session_id: req.params.id, user_id: req.user.sub })
      .first();
    return res.json({ feedback: fb ?? null });
  } catch (err) { next(err); }
}

const router = Router();
router.get('/', authenticate, listHandler);
router.post('/', authenticate, createHandler);
router.get('/my',          authenticate, listMySessionsHandler);  // must be before /:id
router.get('/my-requests', authenticate, listMyRequestsHandler);  // must be before /:id
router.get('/history',     authenticate, historyHandler);         // must be before /:id
router.get('/:id/participants', authenticate, getParticipantsHandler);  // must be before /:id
router.get('/:id/messages',    authenticate, getMessagesHandler);
router.post('/:id/messages',   authenticate, postMessageHandler);
router.get('/:id/score',       authenticate, getScoreHandler);
router.post('/:id/score',      authenticate, postScoreHandler);
router.post('/:id/feedback',   authenticate, postFeedbackHandler);
router.get('/:id/my-feedback', authenticate, getMyFeedbackHandler);
router.get('/:id',         authenticate, getByIdHandler);
router.patch('/:id/status', authenticate, updateStatusHandler);
router.put('/:id',         authenticate, updateSessionHandler);

module.exports = router;
