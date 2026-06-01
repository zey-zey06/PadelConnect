const { sendEmail, FROM } = require('./mailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bourjizeinab@icloud.com';

function devTo(recipients) {
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

function formatPaymentLabel(method, phone) {
  const labels = {
    card:         'Carte bancaire',
    on_arrival:   'Sur place',
    wave:         'Wave',
    orange_money: 'Orange Money',
    balance:      'Solde PadelConnect',
  };
  const label = labels[method] ?? 'Sur place';
  if (phone && (method === 'wave' || method === 'orange_money')) {
    return `${label} (${phone})`;
  }
  return label;
}

function fmtDate(dateVal) {
  const iso = String(dateVal ?? '').slice(0, 10);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function sendBookingConfirmation({ booking, session, slot, venue, players = [], clubName = '' }) {
  const paymentLabel = formatPaymentLabel(booking.payment_method, booking.payment_phone);
  const recipients   = players.map((p) => p.email).filter(Boolean);
  const courtName    = venue?.name ?? '';
  const slotDate     = fmtDate(slot?.date ?? session.date);
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time?.slice(0, 5) ?? '';
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';
  const price        = slot?.price != null ? Number(slot.price).toLocaleString('fr-FR') + ' FCFA' : null;
  const ref          = booking.id?.slice(0, 8).toUpperCase() ?? '';

  await sendEmail({
    from:    FROM,
    to:      devTo(recipients),
    subject: 'Réservation confirmée - PadelConnect 🎾',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Votre réservation est confirmée !</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">Tout est prêt pour votre session de padel.</p>

        <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
            ${clubName ? `<tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>` : ''}
            ${courtName ? `<tr><td style="color:#888">Terrain</td><td style="font-weight:600;color:#1C1C1A">${courtName}</td></tr>` : ''}
            <tr><td style="color:#888">Date</td><td style="font-weight:600;color:#1C1C1A;text-transform:capitalize">${slotDate}</td></tr>
            <tr><td style="color:#888">Heure</td><td style="font-weight:600;color:#1C1C1A">${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</td></tr>
            ${price ? `<tr><td style="color:#888">Prix</td><td style="font-weight:600;color:#1C1C1A">${price}</td></tr>` : ''}
            <tr><td style="color:#888">Paiement</td><td style="font-weight:600;color:#1C1C1A">${paymentLabel}</td></tr>
            <tr><td style="color:#888">Référence</td><td style="font-family:monospace;color:#555;font-size:13px">${ref}</td></tr>
          </table>
        </div>

        <p style="color:#1A3D2B;font-size:14px;font-weight:600">À bientôt sur le terrain ! 🎾</p>
        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

async function sendManagerBookingNotification({ booking, session, slot, venue, booker, managerEmail, playerCount, clubName = '' }) {
  const paymentLabel = formatPaymentLabel(booking.payment_method, booking.payment_phone);
  const courtName    = venue?.name ?? '';
  const slotDate     = fmtDate(slot?.date ?? session.date);
  const slotStart    = slot?.start_time?.slice(0, 5) ?? session.time?.slice(0, 5) ?? '';
  const slotEnd      = slot?.end_time?.slice(0, 5) ?? '';
  const price        = slot?.price != null ? Number(slot.price).toLocaleString('fr-FR') + ' FCFA' : null;
  const ref          = booking.id?.slice(0, 8).toUpperCase() ?? '';

  const playerName  = booker
    ? [booker.first_name, booker.last_name].filter(Boolean).join(' ') || booker.email?.split('@')[0] || 'Joueur'
    : 'Joueur';
  const playerEmail = booker?.email ?? '';
  const playerPhone = booker?.phone_number ?? booker?.phone ?? '';

  await sendEmail({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Nouvelle réservation - ${playerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Nouvelle réservation</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">Un joueur vient de réserver sur votre terrain.</p>

        <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:8px">Joueur</p>
        <div style="background:#F4F4F2;border-radius:12px;padding:16px 20px;margin-bottom:16px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
            <tr><td style="color:#888;width:100px">Nom</td><td style="font-weight:600;color:#1C1C1A">${playerName}</td></tr>
            <tr><td style="color:#888">Email</td><td style="color:#1C1C1A">${playerEmail}</td></tr>
            ${playerPhone ? `<tr><td style="color:#888">Téléphone</td><td style="color:#1C1C1A">${playerPhone}</td></tr>` : ''}
          </table>
        </div>

        <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:8px">Réservation</p>
        <div style="background:#F4F4F2;border-radius:12px;padding:16px 20px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
            ${clubName ? `<tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>` : ''}
            ${courtName ? `<tr><td style="color:#888">Terrain</td><td style="font-weight:600;color:#1C1C1A">${courtName}</td></tr>` : ''}
            <tr><td style="color:#888">Date</td><td style="font-weight:600;color:#1C1C1A;text-transform:capitalize">${slotDate}</td></tr>
            <tr><td style="color:#888">Heure</td><td style="font-weight:600;color:#1C1C1A">${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</td></tr>
            ${price ? `<tr><td style="color:#888">Prix</td><td style="font-weight:600;color:#1C1C1A">${price}</td></tr>` : ''}
            <tr><td style="color:#888">Paiement</td><td style="font-weight:600;color:#1C1C1A">${paymentLabel}</td></tr>
            <tr><td style="color:#888">Joueurs</td><td style="font-weight:600;color:#1C1C1A">${playerCount ?? 1}</td></tr>
            <tr><td style="color:#888">Référence</td><td style="font-family:monospace;color:#555;font-size:13px">${ref}</td></tr>
          </table>
        </div>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

/**
 * Notify a super_admin by email whenever a new player registers.
 */
async function sendNewUserAdminNotification({ displayName, email, motivation, adminEmail, date }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([ADMIN_EMAIL]),
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
      <p style="margin-top:24px;color:#999;font-size:12px">PadelConnect — notification automatique. Ne pas répondre.</p>
    `,
  });
}

module.exports = { sendBookingConfirmation, sendManagerBookingNotification, sendNewUserAdminNotification };
