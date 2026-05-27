const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// Build transport once at startup so the TCP connection can be reused.
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

/**
 * Send a single email via Gmail SMTP (if configured) or Resend (fallback).
 * @param {{ from?: string, to: string|string[], subject: string, html: string }} opts
 */
async function sendEmail({ from, to, subject, html }) {
  const sender = from || FROM;

  if (gmailTransport) {
    await gmailTransport.sendMail({
      from:    sender,
      to:      Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
  } else {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: sender, to, subject, html });
  }
}

module.exports = { sendEmail, FROM };
