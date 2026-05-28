const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const requestsService = require('./requests.service');

const createRequestSchema = Joi.object({
  role: Joi.string().valid('player', 'coach').default('player'),
  coach_user_id: Joi.string().uuid().when('role', {
    is:        'coach',
    then:      Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

const respondSchema = Joi.object({
  status: Joi.string().valid('accepted', 'refused').required(),
});

const invitePlayerSchema = Joi.object({
  player_user_id: Joi.string().uuid().required(),
});

async function createRequestHandler(req, res, next) {
  try {
    const { error, value } = createRequestSchema.validate(req.body ?? {});
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const sessionRequest = await requestsService.createRequest(
      req.params.id,
      req.user.sub,
      { role: value.role, coachUserId: value.coach_user_id ?? null },
    );
    return res.status(201).json({ sessionRequest });
  } catch (err) {
    next(err);
  }
}

async function getRequestsHandler(req, res, next) {
  try {
    const requests = await requestsService.getRequests(req.params.id, req.user.sub);
    return res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function respondHandler(req, res, next) {
  try {
    const { error, value } = respondSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const sessionRequest = await requestsService.respondToRequest(
      req.params.id,
      req.params.requestId,
      req.user.sub,
      value.status,
    );
    return res.json({ sessionRequest });
  } catch (err) {
    next(err);
  }
}

async function invitePlayerHandler(req, res, next) {
  try {
    const { error, value } = invitePlayerSchema.validate(req.body ?? {});
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const result = await requestsService.invitePlayer(req.params.id, req.user.sub, value.player_user_id);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function myRequestsHandler(req, res, next) {
  try {
    const requestsRepo = require('./requests.repository');
    const requests = await requestsRepo.getRequestsByPlayer(req.user.sub);
    return res.json({ requests });
  } catch (err) { next(err); }
}

const router = Router();
router.get('/my-requests',           authenticate, myRequestsHandler);
router.post('/:id/requests',         authenticate, createRequestHandler);
router.get('/:id/requests',          authenticate, getRequestsHandler);
router.patch('/:id/requests/:requestId', authenticate, respondHandler);
router.post('/:id/invite-player',    authenticate, invitePlayerHandler);

module.exports = router;
