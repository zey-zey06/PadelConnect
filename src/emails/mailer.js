const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(mailOptions) {
  try {
    const result = await resend.emails.send({
      from:    mailOptions.from || FROM,
      to:      mailOptions.to,
      subject: mailOptions.subject,
      html:    mailOptions.html,
    });

    if (result.error) {
      const err = new Error(result.error.message || 'Resend error');
      err.code     = result.error.name;
      err.response = result.error;
      throw err;
    }

    console.log('[MAILER] sent to:', mailOptions.to, '— id:', result.data?.id);
    return { messageId: result.data?.id };
  } catch (err) {
    console.error('[MAILER] FAILED to:', mailOptions.to, '—', err.message);
    throw err;
  }
}

module.exports = { sendEmail, FROM };
