const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

console.log('[MAILER] GMAIL_USER:', process.env.GMAIL_USER);
console.log('[MAILER] GMAIL_PASSWORD length:', process.env.GMAIL_PASSWORD?.length);
console.log('[MAILER] Using Gmail:', !!(process.env.GMAIL_USER && process.env.GMAIL_PASSWORD));

const gmailTransport = (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD)
  ? nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    })
  : null;

// Nodemailer-compatible wrapper around the Resend SDK
function createResendTransport() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return {
    sendMail: async ({ from, to, subject, html }) => {
      const result = await resend.emails.send({ from: from || FROM, to, subject, html });
      if (result.error) {
        const err = new Error(result.error.message || 'Resend error');
        err.code     = result.error.name;
        err.response = result.error;
        throw err;
      }
      return { messageId: result.data?.id };
    },
  };
}

async function getTransporter() {
  if (gmailTransport) return gmailTransport;
  return createResendTransport();
}

async function sendEmail(mailOptions) {
  try {
    const transporter = await getTransporter();
    console.log('[MAILER] Attempting to send to:', mailOptions.to);
    const result = await transporter.sendMail({ from: FROM, ...mailOptions });
    console.log('[MAILER] SUCCESS - Message ID:', result.messageId);
    return result;
  } catch (err) {
    console.error('[MAILER] FAILED - Error:', err.message);
    console.error('[MAILER] FAILED - Code:', err.code);
    console.error('[MAILER] FAILED - Response:', err.response);
    throw err;
  }
}

module.exports = { sendEmail, FROM };
