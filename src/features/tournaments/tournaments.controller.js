const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const optionalAuth = require('../../middleware/optionalAuth');
const validate = require('../../middleware/validate');
const svc = require('./tournaments.service');
const sponsorsSvc = require('../sponsors/sponsors.service');

const createSchema = Joi.object({
  name:             Joi.string().max(150).required(),
  description:      Joi.string().max(1000).allow(null, '').optional(),
  format:           Joi.string().valid('elimination', 'round_robin').default('elimination'),
  level_min:        Joi.number().integer().min(1).max(7).default(1),
  level_max:        Joi.number().integer().min(1).max(7).default(7),
  max_teams:        Joi.number().integer().min(2).max(128).default(16),
  registration_fee: Joi.number().min(0).default(0),
  start_date:       Joi.string().isoDate().allow(null, '').optional(),
  end_date:         Joi.string().isoDate().allow(null, '').optional(),
  status:           Joi.string().valid('draft', 'open').default('draft'),
  banner_url:       Joi.string().allow(null, '').optional(),
  club_id:          Joi.string().uuid().allow(null, '').optional(),
});

const registerSchema = Joi.object({
  partner_email:    Joi.string().email().allow(null, '').optional(),
  partner_username: Joi.string().max(50).allow(null, '').optional(),
  payment_method:   Joi.string().valid('wave', 'orange_money', 'mtn_money', 'card', 'cash', 'on_arrival', 'balance').default('on_arrival'),
});

const scoreSchema = Joi.object({
  score_team1: Joi.number().integer().min(0).required(),
  score_team2: Joi.number().integer().min(0).required(),
});

const commentSchema = Joi.object({
  body: Joi.string().max(500).required(),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('draft', 'open', 'ongoing', 'completed').required(),
});

const router = Router();

// POST /api/tournaments
router.post('/', authenticate, validate(createSchema), async (req, res, next) => {
  try {
    if (req.user.role !== 'tournament_organizer') {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Réservé aux organisateurs.' });
    }
    const tournament = await svc.createTournament(req.user.sub, req.body);
    res.status(201).json({ tournament });
  } catch (err) { next(err); }
});

// GET /api/tournaments
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const tournaments = await svc.listTournaments(status);
    res.json({ tournaments });
  } catch (err) { next(err); }
});

// GET /api/tournaments/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub ?? null; // optional auth
    const data = await svc.getTournament(req.params.id, userId);
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/tournaments/:id/status
router.patch('/:id/status', authenticate, validate(statusSchema), async (req, res, next) => {
  try {
    const tournament = await svc.updateTournamentStatus(req.params.id, req.user.sub, req.body.status);
    res.json({ tournament });
  } catch (err) { next(err); }
});

// POST /api/tournaments/:id/register
router.post('/:id/register', authenticate, validate(registerSchema), async (req, res, next) => {
  try {
    const reg = await svc.registerPlayer(req.params.id, req.user.sub, req.body);
    res.status(201).json({ registration: reg });
  } catch (err) { next(err); }
});

// POST /api/tournaments/:id/generate-bracket
router.post('/:id/generate-bracket', authenticate, async (req, res, next) => {
  try {
    const data = await svc.generateBracketForTournament(req.params.id, req.user.sub);
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/tournaments/:id/matches/:matchId
router.patch('/:id/matches/:matchId', authenticate, validate(scoreSchema), async (req, res, next) => {
  try {
    const match = await svc.submitMatchScore(req.params.id, req.params.matchId, req.user.sub, req.body);
    res.json({ match });
  } catch (err) { next(err); }
});

// POST /api/tournaments/:id/like
router.post('/:id/like', authenticate, async (req, res, next) => {
  try {
    const data = await svc.toggleLike(req.params.id, req.user.sub);
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/tournaments/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const comments = await svc.getComments(req.params.id);
    res.json({ comments });
  } catch (err) { next(err); }
});

// POST /api/tournaments/:id/comments
router.post('/:id/comments', authenticate, validate(commentSchema), async (req, res, next) => {
  try {
    const comment = await svc.addComment(req.params.id, req.user.sub, req.body.body);
    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

// PATCH /api/tournaments/:id/cancel
router.patch('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const result = await svc.cancelTournament(req.params.id, req.user.sub);
    res.json(result);
  } catch (err) { next(err); }
});

// PATCH /api/tournaments/:id/registrations/:regId/validate
router.patch('/:id/registrations/:regId/validate', authenticate, async (req, res, next) => {
  try {
    const reg = await svc.validateCashPayment(req.params.id, req.params.regId, req.user.sub);
    res.json({ registration: reg });
  } catch (err) { next(err); }
});

// GET /api/tournaments/:id/sponsors — public
router.get('/:id/sponsors', async (req, res, next) => {
  try {
    const sponsors = await sponsorsSvc.getTournamentSponsors(req.params.id);
    res.json({ sponsors });
  } catch (err) { next(err); }
});

module.exports = router;
