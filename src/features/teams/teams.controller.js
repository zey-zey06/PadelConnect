const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const teamsService = require('./teams.service');

const createTeamSchema = Joi.object({
  name:        Joi.string().max(100).required(),
  logo_url:    Joi.string().allow(null, '').optional(),
  description: Joi.string().max(500).allow(null, '').optional(),
  city:        Joi.string().max(100).allow(null, '').optional(),
});

const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  role:  Joi.string().valid('admin', 'manager', 'staff').default('staff'),
});

const router = Router();

// POST /api/teams — create team (authenticated, tournament_organizer)
router.post('/', authenticate, validate(createTeamSchema), async (req, res, next) => {
  try {
    if (req.user.role !== 'tournament_organizer') {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Réservé aux organisateurs de tournoi.' });
    }
    const team = await teamsService.createTeam(req.user.sub, req.body);
    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/my — get current user's team (must come before /:id)
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const data = await teamsService.getMyTeam(req.user.sub);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/join/:token — accept an invitation (authenticated)
router.get('/join/:token', authenticate, async (req, res, next) => {
  try {
    const data = await teamsService.joinTeam(req.params.token, req.user.sub);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id — public team profile
router.get('/:id', async (req, res, next) => {
  try {
    const data = await teamsService.getTeam(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams/:id/invite — invite a member by email
router.post('/:id/invite', authenticate, validate(inviteSchema), async (req, res, next) => {
  try {
    const result = await teamsService.inviteMember(req.params.id, req.user.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
