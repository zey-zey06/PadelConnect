const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const coachesService = require('./coaches.service');

const availabilitySchema = Joi.object({
  availability: Joi.array().items(
    Joi.object({
      day_of_week: Joi.number().integer().min(0).max(6).required(),
      start_time: Joi.string().required(),
      end_time: Joi.string().required(),
    })
  ).required(),
});

const addCoachSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const invitationSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const respondInvitationSchema = Joi.object({
  status: Joi.string().valid('accepted', 'refused').required(),
});

// ─── /api/coaches router ─────────────────────────────────────────────────────
async function listCoachesHandler(req, res, next) {
  try {
    const { date, time, clubId } = req.query;
    const coaches = await coachesService.listAvailableCoaches({ date, time, clubId });
    return res.json({ coaches });
  } catch (err) {
    next(err);
  }
}

async function getCoachHandler(req, res, next) {
  try {
    const coach = await coachesService.getCoach(req.params.id);
    return res.json({ coach });
  } catch (err) {
    next(err);
  }
}

async function updateAvailabilityHandler(req, res, next) {
  try {
    const { error, value } = availabilitySchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const coach = await coachesService.updateAvailability(req.params.id, req.user.sub, value.availability);
    return res.json({ coach });
  } catch (err) {
    next(err);
  }
}

// ─── /api/clubs router (coaches sub-resource) ────────────────────────────────
async function listClubCoachesHandler(req, res, next) {
  try {
    const coaches = await coachesService.getClubCoaches(req.params.id);
    return res.json({ coaches });
  } catch (err) {
    next(err);
  }
}

async function addCoachToClubHandler(req, res, next) {
  try {
    const { error, value } = addCoachSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const coach = await coachesService.addCoachToClub(req.params.id, req.user.organization_id, value.email);
    return res.status(201).json({ coach });
  } catch (err) {
    next(err);
  }
}

async function removeCoachFromClubHandler(req, res, next) {
  try {
    await coachesService.removeCoachFromClub(req.params.id, req.user.organization_id, req.params.userId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getCoachSessionsHandler(req, res, next) {
  try {
    const sessions = await coachesService.getCoachSessions(req.params.id);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// ─── Invitation handlers ─────────────────────────────────────────────────────

async function sendInvitationHandler(req, res, next) {
  try {
    const { error, value } = invitationSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const invitation = await coachesService.sendClubInvitation(
      req.params.id,
      req.user.organization_id,
      req.user.sub,
      value.email,
    );
    return res.status(201).json({ invitation });
  } catch (err) {
    next(err);
  }
}

async function getPendingInvitationsHandler(req, res, next) {
  try {
    const invitations = await coachesService.getPendingInvitations(req.user.sub);
    return res.json({ invitations });
  } catch (err) {
    next(err);
  }
}

async function respondInvitationHandler(req, res, next) {
  try {
    const { error, value } = respondInvitationSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const result = await coachesService.respondToInvitation(
      req.params.id,
      req.user.sub,
      value.status,
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Routers ─────────────────────────────────────────────────────────────────

const coachesRouter = Router();
coachesRouter.get('/', authenticate, listCoachesHandler);
coachesRouter.get('/me', authenticate, requireRole('coach'), async (req, res, next) => {
  try {
    const coach = await coachesService.getMyCoachProfile(req.user.sub);
    return res.json({ coach });
  } catch (err) {
    next(err);
  }
});
coachesRouter.get('/:id/sessions', authenticate, getCoachSessionsHandler);
coachesRouter.get('/:id', authenticate, getCoachHandler);
coachesRouter.put('/:id/availability', authenticate, updateAvailabilityHandler);

const clubCoachesRouter = Router();
clubCoachesRouter.get('/:id/coaches', authenticate, listClubCoachesHandler);
clubCoachesRouter.post('/:id/coaches', authenticate, requireRole('venue_admin'), addCoachToClubHandler);
// Invitation-based flow: manager sends invite → coach accepts/refuses
clubCoachesRouter.post('/:id/coach-invitations', authenticate, requireRole('venue_admin'), sendInvitationHandler);
clubCoachesRouter.delete('/:id/coaches/:userId', authenticate, requireRole('venue_admin'), removeCoachFromClubHandler);

// /api/coach-invitations routes (coach role)
const coachInvitationsRouter = Router();
coachInvitationsRouter.get('/pending', authenticate, requireRole('coach'), getPendingInvitationsHandler);
coachInvitationsRouter.patch('/:id', authenticate, requireRole('coach'), respondInvitationHandler);

module.exports = { coachesRouter, clubCoachesRouter, coachInvitationsRouter };
