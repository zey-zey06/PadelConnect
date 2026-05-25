const { Router } = require('express');
const Joi          = require('joi');
const authenticate = require('../../middleware/authenticate');
const requireRole  = require('../../middleware/requireRole');
const validate     = require('../../middleware/validate');
const subsService  = require('./subscriptions.service');

const router = Router();
router.use(authenticate, requireRole('venue_admin'));

// GET /api/subscriptions/my
router.get('/my', async (req, res, next) => {
  try {
    const subscription = await subsService.getMySubscription(req.user.organization_id);
    res.json({ subscription });
  } catch (err) { next(err); }
});

// GET /api/subscriptions/history
router.get('/history', async (req, res, next) => {
  try {
    const history = await subsService.getHistory(req.user.organization_id);
    res.json({ history });
  } catch (err) { next(err); }
});

const paySchema = Joi.object({
  payment_method: Joi.string().valid('wave', 'orange_money', 'card', 'agency').required(),
});

// POST /api/subscriptions/pay
router.post('/pay', validate(paySchema), async (req, res, next) => {
  try {
    const subscription = await subsService.pay(req.user.organization_id, req.body.payment_method);
    res.status(201).json({ subscription, ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
