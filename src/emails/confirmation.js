const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingConfirmation({ booking, session }) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    subject: 'Votre réservation PadelConnect est confirmée',
    html: `
      <h1>Réservation confirmée ✓</h1>
      <p>Votre réservation pour la session du <strong>${session.date}</strong>
         à <strong>${session.time}</strong> est confirmée.</p>
      <p>Référence réservation : <code>${booking.id}</code></p>
      <p>À bientôt sur le terrain !</p>
    `,
  });
}

module.exports = { sendBookingConfirmation };
