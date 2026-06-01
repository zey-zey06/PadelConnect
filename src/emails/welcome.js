const { sendEmail } = require('./mailer');

async function sendWelcomeEmail(email, firstName) {
  const name = (firstName || '').trim() || 'Joueur';
  await sendEmail({
    to:      email,
    subject: 'Bienvenue sur PadelConnect ! 🎾',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur PadelConnect</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1A3D2B;padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="background:#2D6A4F;border-radius:8px;padding:8px 12px;margin-right:8px;">
                    <span style="color:#ffffff;font-weight:800;font-size:16px;letter-spacing:0.5px;">P</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                      Padel<span style="color:#5dcaa5;">Connect</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1A3D2B;">
                Bienvenue ${name} ! 🎾
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444444;">
                Votre compte est confirmé. Vous faites maintenant partie de la communauté padel d'Abidjan.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444444;">
                Trouvez des partenaires, réservez des terrains et progressez ensemble sur PadelConnect.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background:#1A3D2B;">
                    <a href="https://padelconnect.onrender.com"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.2px;">
                      Découvrir l'app →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #f0f0f0;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#999999;">
                L'équipe PadelConnect<br />
                <span style="color:#5dcaa5;">🎾</span> Abidjan, Côte d'Ivoire
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

async function sendManagerWelcomeEmail(email, firstName) {
  const name = (firstName || '').trim() || 'Gérant';
  const APP_URL = process.env.APP_URL || 'https://padelconnect.onrender.com';
  await sendEmail({
    to:      email,
    subject: 'Bienvenue sur PadelConnect Gérant ! 🏟️',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue Gérant PadelConnect</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1A3D2B;padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="background:#2D6A4F;border-radius:8px;padding:8px 12px;margin-right:8px;">
                    <span style="color:#ffffff;font-weight:800;font-size:16px;letter-spacing:0.5px;">P</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                      Padel<span style="color:#5dcaa5;">Connect</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1A3D2B;">
                Bienvenue ${name} ! 🏟️
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444444;">
                Votre espace gérant est prêt. Commencez par configurer votre club.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444444;">
                Ajoutez vos terrains, définissez vos créneaux et commencez à recevoir des réservations dès aujourd'hui.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background:#1A3D2B;">
                    <a href="${APP_URL}/manager"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.2px;">
                      Accéder à mon espace →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #f0f0f0;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#999999;">
                L'équipe PadelConnect<br />
                <span style="color:#5dcaa5;">🎾</span> Abidjan, Côte d'Ivoire
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

module.exports = { sendWelcomeEmail, sendManagerWelcomeEmail };
