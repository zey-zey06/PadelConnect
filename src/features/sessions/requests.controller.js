const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const requestsService = require('./requests.service');

const respondSchema = Joi.object({
  status: Joi.string().valid('accepted', 'refused').required(),
});

async function createRequestHandler(req, res, next) {
  try {
    const sessionRequest = await requestsService.createRequest(req.params.id, req.user.sub);
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

const router = Router();
router.post('/:id/requests', authenticate, createRequestHandler);
router.get('/:id/requests', authenticate, getRequestsHandler);
router.patch('/:id/requests/:requestId', authenticate, respondHandler);

module.exports = router;
