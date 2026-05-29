const { sendEmail, FROM } = require('./mailer');

function devTo(recipients) {
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

function fmtDate(dateVal) {
  const iso = String(dateVal ?? '').slice(0, 10);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Send cancellation emails to both the player and the club manager.
 * All non-fatal — caller must .catch(() => {}).
 */
async function sendBookingCancellation({ booking, session, slot, venue, booker, managerEmail, isLate = false, clubName = '' }) {
  const courtName  = venue?.name ?? '';
  const slotDate   = fmtDate(slot?.date ?? session?.date);
  const slotStart  = slot?.start_time?.slice(0, 5) ?? session?.time?.slice(0, 5) ?? '';
  const slotEnd    = slot?.end_time?.slice(0, 5) ?? '';
  const ref        = booking.id?.slice(0, 8).toUpperCase() ?? '';

  const playerName  = booker
    ? [booker.first_name, booker.last_name].filter(Boolean).join(' ') || booker.email?.split('@')[0] || 'Joueur'
    : 'Joueur';
  const playerEmail = booker?.email ?? '';

  const lateNote = isLate
    ? `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:12px 16px;margin-top:16px;font-size:13px;color:#92400E">
        <strong>Annulation tardive</strong> — moins de 4h avant la session.<br>
        Une pénalité a été enregistrée sur votre compte.
       </div>`
    : '';

  const sends = [];

  // ── Email to player ───────────────────────────────────────────────────────
  if (playerEmail) {
    sends.push(
      sendEmail({
        from:    FROM,
        to:      devTo([playerEmail]),
        subject: 'Réservation annulée - PadelConnect',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
            <div style="margin-bottom:24px">
              <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
            </div>
            <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Réservation annulée</h1>
            <p style="color:#666;margin-top:0;margin-bottom:28px">Votre réservation a bien été annulée.</p>

            <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:16px">
              <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
                ${clubName ? `<tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>` : ''}
                ${courtName ? `<tr><td style="color:#888">Terrain</td><td style="font-weight:600;color:#1C1C1A">${courtName}</td></tr>` : ''}
                <tr><td style="color:#888">Date</td><td style="font-weight:600;color:#1C1C1A;text-transform:capitalize">${slotDate}</td></tr>
                <tr><td style="color:#888">Heure</td><td style="font-weight:600;color:#1C1C1A">${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</td></tr>
                <tr><td style="color:#888">Référence</td><td style="font-family:monospace;color:#555;font-size:13px">${ref}</td></tr>
              </table>
            </div>

            ${lateNote}

            <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
          </div>
        `,
      }).catch(() => {})
    );
  }

  // ── Email to club manager ─────────────────────────────────────────────────
  if (managerEmail) {
    const playerPhone = booker?.phone_number ?? booker?.phone ?? '';
    sends.push(
      sendEmail({
        from:    FROM,
        to:      devTo([managerEmail]),
        subject: `Réservation annulée - ${playerName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
            <div style="margin-bottom:24px">
              <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
            </div>
            <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Réservation annulée</h1>
            <p style="color:#666;margin-top:0;margin-bottom:28px">Un joueur a annulé sa réservation.</p>

            <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:8px">Joueur</p>
            <div style="background:#F4F4F2;border-radius:12px;padding:16px 20px;margin-bottom:16px">
              <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
                <tr><td style="color:#888;width:100px">Nom</td><td style="font-weight:600;color:#1C1C1A">${playerName}</td></tr>
                <tr><td style="color:#888">Email</td><td style="color:#1C1C1A">${playerEmail}</td></tr>
                ${playerPhone ? `<tr><td style="color:#888">Téléphone</td><td style="color:#1C1C1A">${playerPhone}</td></tr>` : ''}
              </table>
            </div>

            <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:8px">Réservation annulée</p>
            <div style="background:#F4F4F2;border-radius:12px;padding:16px 20px;margin-bottom:16px">
              <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
                ${clubName ? `<tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>` : ''}
                ${courtName ? `<tr><td style="color:#888">Terrain</td><td style="font-weight:600;color:#1C1C1A">${courtName}</td></tr>` : ''}
                <tr><td style="color:#888">Date</td><td style="font-weight:600;color:#1C1C1A;text-transform:capitalize">${slotDate}</td></tr>
                <tr><td style="color:#888">Heure</td><td style="font-weight:600;color:#1C1C1A">${slotStart}${slotEnd ? ` – ${slotEnd}` : ''}</td></tr>
                <tr><td style="color:#888">Référence</td><td style="font-family:monospace;color:#555;font-size:13px">${ref}</td></tr>
              </table>
            </div>

            ${isLate ? `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:12px 16px;font-size:13px;color:#92400E"><strong>Annulation tardive</strong> — moins de 4h avant la session.</div>` : ''}

            <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
          </div>
        `,
      }).catch(() => {})
    );
  }

  await Promise.allSettled(sends);
}

module.exports = { sendBookingCancellation };
