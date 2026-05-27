const { sendEmail, FROM } = require('./mailer');

function devTo(recipients) {
  // In dev, always send to EMAIL_FROM to avoid Resend unverified-domain errors
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

function formatPaymentLabel(method, phone) {
  const labels = {
    card:         'Carte bancaire',
    on_arrival:   'Sur place',
    wave:         'Wave',
    orange_money: 'Orange Money',
  };
  const label = labels[method] ?? 'Sur place';
  if (phone && (method === 'wave' || method === 'orange_money')) {
    return `${label} (${phone})`;
  }
  return label;
}

async function sendBookingConfirmation({ booking, session, slot, venue, players = [] }) {
  const paymentLabel = formatPaymentLabel(booking.payment_method, booking.payment_phone);
  const recipients   = players.map((p) => p.email).filter(Boolean);
  const venueName    = venue?.name ?? '';
  const slotDate     = slot?.date ?? session.date;
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time;
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';

  await sendEmail({
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
  const paymentLabel = formatPaymentLabel(booking.payment_method, booking.payment_phone);
  const slotDate     = slot?.date ?? session.date;
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time;
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';

  await sendEmail({
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

/**
 * Notify a super_admin by email whenever a new player registers.
 * Non-blocking — caller should .catch(() => {}) this.
 */
async function sendNewUserAdminNotification({ displayName, email, motivation, adminEmail, date }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([adminEmail]),
    subject: `Nouvel inscrit PadelConnect — ${displayName}`,
    html: `
      <h1 style="color:#7c3aed">Nouvel inscrit sur PadelConnect 🎾</h1>
      <table style="font-size:14px;line-height:1.6;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#888;font-weight:600">Nom</td>      <td>${displayName}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;font-weight:600">Email</td>    <td>${email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;font-weight:600">Date</td>     <td>${date}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;font-weight:600;vertical-align:top">Motivation</td>
            <td style="max-width:380px">${motivation}</td></tr>
      </table>
      <p style="margin-top:24px;color:#999;font-size:12px">
        PadelConnect — notification automatique. Ne pas répondre.
      </p>
    `,
  });
}

module.exports = { sendBookingConfirmation, sendManagerBookingNotification, sendNewUserAdminNotification };
