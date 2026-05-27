const { sendEmail, FROM } = require('./mailer');

async function sendBookingCancellation({ booking, session }) {
  await sendEmail({
    from:    FROM,
    to:      FROM,
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
