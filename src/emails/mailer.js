const nodemailer = require('nodemailer');

const FROM = process.env.GMAIL_USER || 'padelconnectci@gmail.com';

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
}

async function sendEmail(mailOptions) {
  try {
    const transporter = getTransporter();
    console.log('[MAILER] Attempting to send to:', mailOptions.to);
    const result = await transporter.sendMail(mailOptions);
    console.log('[MAILER] SUCCESS:', result.messageId);
    return result;
  } catch (err) {
    console.error('[MAILER] FAILED:', err.message);
    throw err;
  }
}

module.exports = { sendEmail, FROM };
