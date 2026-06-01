const { sendEmail, FROM } = require('./mailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bourjizeinab@icloud.com';
const APP_URL     = process.env.APP_URL || 'https://padelconnect.onrender.com';

async function sendAdminLoginAlert({ ip, deviceInfo, date }) {
  await sendEmail({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: '🔐 Nouvelle connexion - PadelConnect Admin',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#7C3AED;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect Admin</span>
        </div>

        <h1 style="font-size:20px;color:#1C1C1A;margin-bottom:4px">Nouvelle connexion détectée</h1>
        <p style="color:#666;margin-top:0;margin-bottom:24px">Une connexion à votre compte administrateur a été détectée.</p>

        <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:2">
            <tr>
              <td style="color:#888;width:130px;vertical-align:top">Date et heure</td>
              <td style="font-weight:600;color:#1C1C1A;text-transform:capitalize">${date}</td>
            </tr>
            <tr>
              <td style="color:#888;vertical-align:top">Appareil</td>
              <td style="font-weight:600;color:#1C1C1A">${deviceInfo ?? 'Inconnu'}</td>
            </tr>
            <tr>
              <td style="color:#888;vertical-align:top">Adresse IP</td>
              <td style="font-family:monospace;color:#1C1C1A;font-size:13px">${ip}</td>
            </tr>
          </table>
        </div>

        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:14px 18px;margin-bottom:28px">
          <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5">
            Si ce n'était pas vous, <strong>changez votre mot de passe immédiatement</strong>.
          </p>
        </div>

        <a
          href="${APP_URL}/forgot-password"
          style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none"
        >
          Changer mon mot de passe
        </a>

        <p style="color:#999;font-size:12px;margin-top:32px">PadelConnect — alerte de sécurité automatique. Ne pas répondre.</p>
      </div>
    `,
  });
}

module.exports = { sendAdminLoginAlert };
