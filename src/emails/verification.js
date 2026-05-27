const { sendEmail, FROM } = require('./mailer');

async function sendVerificationEmail(email, token) {
  const url = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/verify-email?token=${token}`;

  await sendEmail({
    from:    FROM,
    to:      email,
    subject: 'Vérifiez votre adresse email — PadelConnect',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:8px">Vérifiez votre email</h1>
        <p style="color:#666;line-height:1.6;margin-bottom:24px">
          Merci de rejoindre PadelConnect ! Cliquez sur le bouton ci-dessous pour activer votre compte.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#1A3D2B;color:#FAF8F5;padding:14px 28px;
                  border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Vérifier mon email
        </a>
        <p style="color:#999;font-size:13px;margin-top:24px;line-height:1.5">
          Ce lien expire dans 24 heures.<br>
          Si vous n'avez pas créé de compte PadelConnect, ignorez cet email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
