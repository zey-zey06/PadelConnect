const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'onboarding@resend.dev';

function devTo(recipients) {
  // In dev, always send to EMAIL_FROM to avoid Resend unverified-domain errors
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

async function sendBookingConfirmation({ booking, session, slot, venue, players = [] }) {
  const paymentLabel = booking.payment_method === 'card' ? 'Carte bancaire' : 'Sur place';
  const recipients   = players.map((p) => p.email).filter(Boolean);
  const venueName    = venue?.name ?? '';
  const slotDate     = slot?.date ?? session.date;
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time;
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';

  await resend.emails.send({
    from:    FROM,
    to:      devTo(recipients),
    subject: 'Votre réservation PadelConnect est confirmée',
    html: `
      <h1>Réservation confirmée ✓</h1>
      ${venueName ? `<p><strong>Terrain :</strong> ${venueName}</p>` : ''}
      <p><strong>Date :</strong> ${slotDate}</p>
      <p><strong>Heure :</strong> ${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</p>
      <p><strong>Mode de paiement :</strong> ${paymentLabel}</p>
      <p><strong>Référence :</strong> <code>${booking.id}</code></p>
      <p>À bientôt sur le terrain !</p>
    `,
  });
}

async function sendManagerBookingNotification({ booking, session, slot, venue, booker, managerEmail, playerCount }) {
  const paymentLabel = booking.payment_method === 'card' ? 'Carte bancaire' : 'Sur place';
  const slotDate     = slot?.date ?? session.date;
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time;
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';

  await resend.emails.send({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Nouvelle réservation — ${venue?.name ?? 'Terrain'}`,
    html: `
      <h1>Nouvelle réservation reçue</h1>
      <p><strong>Terrain :</strong> ${venue?.name ?? ''}</p>
      <p><strong>Date :</strong> ${slotDate}</p>
      <p><strong>Heure :</strong> ${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</p>
      <p><strong>Réservé par :</strong> ${booker?.name ?? ''} (${booker?.email ?? ''})</p>
      <p><strong>Mode de paiement :</strong> ${paymentLabel}</p>
      <p><strong>Joueurs dans la session :</strong> ${playerCount ?? 1}</p>
      <p><strong>Référence :</strong> <code>${booking.id}</code></p>
    `,
  });
}

module.exports = { sendBookingConfirmation, sendManagerBookingNotification };
