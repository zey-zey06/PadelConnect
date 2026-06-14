const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const teamsService   = require('./teams.service');
const sponsorsService = require('../sponsors/sponsors.service');

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

const sponsorSchema = Joi.object({
  name:          Joi.string().max(100).required(),
  logo_url:      Joi.string().allow(null, '').optional(),
  website_url:   Joi.string().uri().allow(null, '').optional(),
  amount:        Joi.number().min(0).allow(null).optional(),
  currency:      Joi.string().max(10).default('FCFA'),
  type:          Joi.string().valid('main', 'partner', 'media').default('partner'),
  tournament_id: Joi.string().uuid().allow(null, '').optional(),
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

// ── Sponsor routes (must come before /:id) ──────────────────────────────────

// GET /api/teams/:id/sponsors — public
router.get('/:id/sponsors', async (req, res, next) => {
  try {
    const sponsors = await sponsorsService.getTeamSponsors(req.params.id);
    res.json({ sponsors });
  } catch (err) { next(err); }
});

// POST /api/teams/:id/sponsors — add sponsor (admin/manager only)
router.post('/:id/sponsors', authenticate, validate(sponsorSchema), async (req, res, next) => {
  try {
    const sponsor = await sponsorsService.addSponsor(req.user.sub, req.params.id, req.body);
    res.status(201).json({ sponsor });
  } catch (err) { next(err); }
});

// DELETE /api/teams/:id/sponsors/:sponsorId — remove sponsor (admin/manager only)
router.delete('/:id/sponsors/:sponsorId', authenticate, async (req, res, next) => {
  try {
    await sponsorsService.deleteSponsor(req.user.sub, req.params.id, req.params.sponsorId);
    res.json({ ok: true });
  } catch (err) { next(err); }
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
