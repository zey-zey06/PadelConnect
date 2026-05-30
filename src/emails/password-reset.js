const { sendEmail } = require('./mailer');

async function sendPasswordResetEmail(to, code) {
  await sendEmail({
    to,
    subject: 'Réinitialisation de votre mot de passe PadelConnect',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#16a34a;border-radius:12px">
            <span style="color:#fff;font-size:22px;font-weight:700">P</span>
          </div>
          <h2 style="margin:12px 0 0;font-size:20px;font-weight:700;color:#111">PadelConnect</h2>
        </div>

        <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;text-align:center">
          Réinitialisation du mot de passe
        </h1>
        <p style="color:#555;font-size:15px;text-align:center;margin:0 0 32px">
          Voici votre code de réinitialisation. Il expire dans <strong>1 heure</strong>.
        </p>

        <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#16a34a;font-family:monospace">
            ${code}
          </span>
        </div>

        <p style="color:#888;font-size:13px;text-align:center;margin:0">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          Votre mot de passe ne sera pas modifié.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
