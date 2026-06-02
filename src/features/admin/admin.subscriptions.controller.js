const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole  = require('../../middleware/requireRole');
const subsService  = require('../subscriptions/subscriptions.service');

const router = Router();
router.use(authenticate, requireRole('super_admin'));

// GET /api/admin/subscriptions
router.get('/', async (req, res, next) => {
  try {
    const data = await subsService.getAllSubscriptions();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/admin/subscriptions/revenue?period=month|week|all
router.get('/revenue', async (req, res, next) => {
  try {
    const period = ['month', 'week', 'all'].includes(req.query.period) ? req.query.period : 'month';
    const data = await subsService.getRevenue(period);
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/admin/subscriptions/:orgId/activate
router.patch('/:orgId/activate', async (req, res, next) => {
  try {
    await subsService.activate(req.params.orgId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/admin/subscriptions/:orgId/suspend
router.patch('/:orgId/suspend', async (req, res, next) => {
  try {
    await subsService.suspend(req.params.orgId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/admin/subscriptions/:orgId/mark-paid
// Manually record a cash payment and set club to active.
router.patch('/:orgId/mark-paid', async (req, res, next) => {
  try {
    const sub = await subsService.markPaidManual(req.params.orgId);
    res.json({ sub, ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
