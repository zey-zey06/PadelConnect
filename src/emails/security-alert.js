const { sendEmail, FROM } = require('./mailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bourjizeinab@icloud.com';

async function sendAdminLoginAlert({ ip, userAgent, date }) {
  await sendEmail({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: 'Nouvelle connexion - PadelConnect Admin',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#7C3AED;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect Admin</span>
        </div>
        <h1 style="font-size:20px;color:#1C1C1A;margin-bottom:4px">Nouvelle connexion détectée</h1>
        <p style="color:#666;margin-top:0;margin-bottom:24px">Une connexion au compte super administrateur a été effectuée.</p>

        <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.9">
            <tr>
              <td style="color:#888;width:120px;vertical-align:top">Date</td>
              <td style="font-weight:600;color:#1C1C1A">${date}</td>
            </tr>
            <tr>
              <td style="color:#888;vertical-align:top">Adresse IP</td>
              <td style="font-family:monospace;color:#1C1C1A;font-size:13px">${ip}</td>
            </tr>
            <tr>
              <td style="color:#888;vertical-align:top">Appareil</td>
              <td style="color:#555;font-size:12px;word-break:break-all">${userAgent}</td>
            </tr>
          </table>
        </div>

        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:14px 18px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#92400E">
            Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe immédiatement.
          </p>
        </div>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — alerte de sécurité automatique. Ne pas répondre.</p>
      </div>
    `,
  });
}

module.exports = { sendAdminLoginAlert };
