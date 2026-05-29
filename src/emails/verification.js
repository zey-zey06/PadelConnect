const { sendEmail, FROM } = require('./mailer');

async function sendVerificationEmail(email, code) {
  await sendEmail({
    from:    FROM,
    to:      email,
    subject: `Votre code PadelConnect : ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:8px">Vérifiez votre email</h1>
        <p style="color:#666;line-height:1.6;margin-bottom:28px">
          Entrez le code ci-dessous pour activer votre compte PadelConnect.
        </p>
        <div style="background:#F4F4F2;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:24px">
          <p style="color:#666;font-size:14px;margin:0 0 12px 0">Votre code de vérification</p>
          <p style="font-size:44px;font-weight:800;letter-spacing:14px;color:#1A3D2B;margin:0;font-family:monospace">${code}</p>
        </div>
        <p style="color:#999;font-size:13px;line-height:1.6;margin:0">
          Ce code expire dans <strong>10 minutes</strong>.<br>
          Si vous n'avez pas créé de compte PadelConnect, ignorez cet email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
