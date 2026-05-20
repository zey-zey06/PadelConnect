const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const penaltiesService = require('./penalties.service');

// ── Validation schemas ────────────────────────────────────────────────────────
const createBanSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  reason: Joi.string().max(500).optional(),
});

const updateConfigSchema = Joi.object({
  no_show_amount: Joi.number().integer().min(0).optional(),
  late_cancel_amount: Joi.number().integer().min(0).optional(),
}).min(1);

// ── Penalties router (player-facing) ─────────────────────────────────────────
const penaltiesRouter = Router();

penaltiesRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const penalties = await penaltiesService.getMyPenalties(req.user.sub);
    res.json({ penalties });
  } catch (err) {
    next(err);
  }
});

penaltiesRouter.patch('/:id/pay', authenticate, async (req, res, next) => {
  try {
    const penalty = await penaltiesService.payPenalty(req.params.id, req.user.sub);
    res.json({ penalty });
  } catch (err) {
    next(err);
  }
});

// ── Admin router (super_admin only) ──────────────────────────────────────────
const adminRouter = Router();

adminRouter.post(
  '/bans',
  authenticate,
  requireRole('super_admin'),
  validate(createBanSchema),
  async (req, res, next) => {
    try {
      const ban = await penaltiesService.createAppBan(req.body.user_id, req.body.reason);
      res.status(201).json({ ban });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.patch(
  '/penalties/config',
  authenticate,
  requireRole('super_admin'),
  validate(updateConfigSchema),
  (req, res) => {
    const config = penaltiesService.updatePenaltiesConfig(req.body);
    res.json({ config });
  }
);

module.exports = { penaltiesRouter, adminRouter };
