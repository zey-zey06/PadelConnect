const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const sessionsService = require('./sessions.service');

const createSessionSchema = Joi.object({
  date:       Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  time:       Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
  end_time:   Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional().allow(null, ''),
  max_players: Joi.number().integer().min(2).max(4).required(),
  preferences: Joi.object().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'complete', 'cancelled').required(),
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

const router = Router();
router.get('/', authenticate, listHandler);
router.post('/', authenticate, createHandler);
router.get('/my', authenticate, listMySessionsHandler); // must be before /:id
router.get('/my-requests', authenticate, listMyRequestsHandler); // must be before /:id
router.get('/:id', authenticate, getByIdHandler);
router.patch('/:id/status', authenticate, updateStatusHandler);

module.exports = router;
