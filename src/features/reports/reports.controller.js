const { Router }            = require('express');
const authenticate          = require('../../middleware/authenticate');
const adminRepo             = require('../admin/admin.repository');
const notificationsService  = require('../notifications/notifications.service');
const db                    = require('../../db');

const VALID_REASONS = ['spam', 'inappropriate', 'fake', 'other'];
const REASON_LABELS = {
  spam:          'spam',
  inappropriate: 'contenu inapproprié',
  fake:          'faux profil',
  other:         'autre raison',
};

const router = Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { reported_user_id, reason, description } = req.body;

    if (!reported_user_id || !reason) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Champs requis manquants.' });
    }
    if (!VALID_REASONS.includes(reason)) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Raison invalide.' });
    }
    if (reported_user_id === req.user.sub) {
      return res.status(400).json({ status: 400, error: 'Bad Request', message: 'Vous ne pouvez pas vous signaler vous-même.' });
    }

    const reportedUser = await db('users').where({ id: reported_user_id }).whereNull('deleted_at').first();
    if (!reportedUser) {
      return res.status(404).json({ status: 404, error: 'Not Found', message: 'Utilisateur introuvable.' });
    }

    const reporterName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ')
      || req.user.email || 'Utilisateur';
    const reportedName = [reportedUser.first_name, reportedUser.last_name].filter(Boolean).join(' ')
      || reportedUser.email || 'Utilisateur';

    const desc = description?.trim().slice(0, 200);
    const msg  = `🚨 Signalement : ${reporterName} a signalé ${reportedName} pour ${REASON_LABELS[reason]}${desc ? ` — "${desc}"` : ''}.`;

    const admins = await adminRepo.getSuperAdmins();
    await Promise.allSettled(
      admins.map((a) => notificationsService.createNotification(a.id, 'contact_form', msg))
    );

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
