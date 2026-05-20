const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const adminService = require('./admin.service');

// ── Validation schemas ────────────────────────────────────────────────────────
const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'banned').required(),
});

const updateClubStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

// All admin endpoints require authentication + super_admin role
const router = Router();
router.use(authenticate, requireRole('super_admin'));

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await adminService.getDashboard();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.role)   filters.role = req.query.role;
    const users = await adminService.listUsers(filters);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/status', validate(updateUserStatusSchema), async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus(req.params.id, req.body.status);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    const sessions = await adminService.listSessions(filters);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// ── Clubs ─────────────────────────────────────────────────────────────────────
router.get('/clubs', async (req, res, next) => {
  try {
    const clubs = await adminService.listClubs();
    res.json({ clubs });
  } catch (err) {
    next(err);
  }
});

router.patch('/clubs/:id/status', validate(updateClubStatusSchema), async (req, res, next) => {
  try {
    const club = await adminService.updateClubStatus(req.params.id, req.body.status);
    res.json({ club });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
