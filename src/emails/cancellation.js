const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingCancellation({ booking, session }) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    subject: 'Votre réservation PadelConnect a été annulée',
    html: `
      <h1>Réservation annulée</h1>
      <p>Votre réservation pour la session du <strong>${session.date}</strong>
         à <strong>${session.time}</strong> a été annulée.</p>
      <p>L'annulation a été effectuée après le délai de 4h — une pénalité a été enregistrée.</p>
      <p>Référence réservation : <code>${booking.id}</code></p>
    `,
  });
}

module.exports = { sendBookingCancellation };
