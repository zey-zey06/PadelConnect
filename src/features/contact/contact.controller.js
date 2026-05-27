const { Router } = require('express');
const { Resend } = require('resend');
const adminRepo            = require('../admin/admin.repository');
const notificationsService = require('../notifications/notifications.service');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(422).json({
        status: 422,
        error: 'Validation Error',
        message: 'Tous les champs sont requis.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({
        status: 422,
        error: 'Validation Error',
        message: 'Adresse email invalide.',
      });
    }

    await resend.emails.send({
      from:     FROM,
      to:       FROM,
      replyTo:  email,
      subject:  `[PadelConnect Contact] ${subject}`,
      html: `
        <h2 style="color:#1A3D2B">Nouveau message de contact</h2>
        <table style="font-size:14px;line-height:1.8;border-collapse:collapse">
          <tr><td style="padding:2px 16px 2px 0;color:#888;font-weight:600">Nom</td>     <td>${name}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#888;font-weight:600">Email</td>   <td>${email}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#888;font-weight:600">Sujet</td>   <td>${subject}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
        <p style="font-size:14px;line-height:1.7;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p style="margin-top:24px;color:#999;font-size:12px">PadelConnect — formulaire de contact. Répondre directement à cet email.</p>
      `,
    });

    // Notify super_admins in-app (fire-and-forget)
    adminRepo.getSuperAdmins().then((admins) => {
      const msg = `Nouveau message de contact de ${name} (${email}) — sujet: ${subject}`;
      return Promise.allSettled(
        admins.map((a) => notificationsService.createNotification(a.id, 'contact_form', msg))
      );
    }).catch(() => {});

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
