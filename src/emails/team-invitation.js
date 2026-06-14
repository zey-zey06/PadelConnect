const { sendEmail, FROM } = require('./mailer');

function devTo(recipients) {
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

async function sendTeamInvitation({ toEmail, teamName, inviterName, joinUrl }) {
  await sendEmail({
    from: FROM,
    to: devTo([toEmail]),
    subject: `Vous êtes invité à rejoindre l'équipe ${teamName} - PadelConnect`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Invitation à rejoindre une équipe</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">
          <strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>${teamName}</strong> sur PadelConnect.
        </p>

        <a href="${joinUrl}"
           style="display:inline-block;background:#1A3D2B;color:#FAF8F5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Rejoindre l'équipe →
        </a>

        <p style="color:#999;font-size:12px;margin-top:32px">
          Ce lien expire dans 48 heures. Si vous n'avez pas demandé cette invitation, ignorez cet email.
        </p>
        <p style="color:#999;font-size:12px;margin-top:8px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

module.exports = { sendTeamInvitation };
