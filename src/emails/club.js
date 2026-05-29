const { sendEmail, FROM } = require('./mailer');

function devTo(recipients) {
  if (process.env.NODE_ENV === 'production' && recipients.length > 0) return recipients;
  return FROM;
}

function fmtDate(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  return isNaN(d) ? String(dateVal) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Admin alert: new club registered and awaiting validation. */
async function sendNewClubAdminAlert({ clubName, managerEmail, managerName, phone, address, courtsCount, adminEmail }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([adminEmail]),
    subject: `Nouveau club en attente de validation - ${clubName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#7C3AED;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect Admin</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Nouveau club en attente de validation</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">Un gérant vient d'inscrire son club et attend votre validation.</p>

        <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
            <tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>
            <tr><td style="color:#888">Gérant</td><td style="font-weight:600;color:#1C1C1A">${managerName || '—'}</td></tr>
            <tr><td style="color:#888">Email</td><td style="color:#1C1C1A">${managerEmail}</td></tr>
            ${phone ? `<tr><td style="color:#888">Téléphone</td><td style="color:#1C1C1A">${phone}</td></tr>` : ''}
            ${address ? `<tr><td style="color:#888">Adresse</td><td style="color:#1C1C1A">${address}</td></tr>` : ''}
            <tr><td style="color:#888">Terrains</td><td style="font-weight:600;color:#1C1C1A">${courtsCount ?? '—'}</td></tr>
          </table>
        </div>

        <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/admin/dashboard"
           style="display:inline-block;background:#7C3AED;color:#FAF8F5;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Valider ce club →
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

/** Manager notification: club has been validated and is now active. */
async function sendClubValidated({ clubName, managerEmail }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Votre club a été validé - PadelConnect`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Votre club a été validé ! 🎉</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">
          <strong>${clubName}</strong> est maintenant actif sur PadelConnect. Vous pouvez vous connecter à votre tableau de bord pour gérer vos terrains et accueillir vos premiers joueurs.
        </p>

        <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/manager/dashboard"
           style="display:inline-block;background:#1A3D2B;color:#FAF8F5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Accéder à mon tableau de bord →
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

/** Manager receipt after subscription payment. */
async function sendSubscriptionReceipt({ clubName, managerEmail, venueCount, amount, periodStart, periodEnd }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Reçu abonnement PadelConnect - ${fmtDate(periodStart)}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Reçu de paiement</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">Votre abonnement PadelConnect a bien été enregistré.</p>

        <div style="background:#F4F4F2;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.8">
            <tr><td style="color:#888;width:140px">Club</td><td style="font-weight:600;color:#1C1C1A">${clubName}</td></tr>
            <tr><td style="color:#888">Terrains</td><td style="font-weight:600;color:#1C1C1A">${venueCount}</td></tr>
            <tr><td style="color:#888">Période</td><td style="color:#1C1C1A">${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</td></tr>
            <tr><td style="color:#888;border-top:1px solid #E5E5E5;padding-top:8px">Montant</td>
                <td style="font-weight:700;font-size:16px;color:#1A3D2B;border-top:1px solid #E5E5E5;padding-top:8px">
                  ${Number(amount).toLocaleString('fr-FR')} FCFA
                </td>
            </tr>
          </table>
        </div>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

/** Manager reminder: subscription expiring in daysLeft days. */
async function sendSubscriptionReminder({ clubName, managerEmail, daysLeft, amountDue }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Votre abonnement expire dans ${daysLeft} jours - PadelConnect`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#1C1C1A;margin-bottom:4px">Votre abonnement expire bientôt</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">
          L'abonnement de <strong>${clubName}</strong> expire dans <strong>${daysLeft} jours</strong>. Renouvelez-le pour maintenir l'accès à la plateforme.
        </p>

        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;font-size:14px;color:#92400E">
            <strong>Montant dû :</strong> ${Number(amountDue).toLocaleString('fr-FR')} FCFA / mois
          </p>
        </div>

        <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/manager/dashboard"
           style="display:inline-block;background:#1A3D2B;color:#FAF8F5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Renouveler mon abonnement →
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

/** Manager notification: subscription expired and club suspended. */
async function sendSubscriptionSuspended({ clubName, managerEmail }) {
  await sendEmail({
    from:    FROM,
    to:      devTo([managerEmail]),
    subject: `Votre abonnement a expiré - Club suspendu`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
        </div>
        <h1 style="font-size:22px;color:#DC2626;margin-bottom:4px">Club suspendu</h1>
        <p style="color:#666;margin-top:0;margin-bottom:28px">
          L'abonnement de <strong>${clubName}</strong> a expiré. Votre club est temporairement suspendu et n'est plus visible sur la plateforme.
        </p>

        <div style="background:#FEE2E2;border-left:4px solid #DC2626;border-radius:4px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;font-size:14px;color:#991B1B">
            Pour réactiver votre club, renouvelez votre abonnement depuis votre tableau de bord.
          </p>
        </div>

        <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/manager/dashboard"
           style="display:inline-block;background:#DC2626;color:#FAF8F5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Réactiver mon abonnement →
        </a>

        <p style="color:#999;font-size:12px;margin-top:24px">PadelConnect — ne pas répondre à cet email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendNewClubAdminAlert,
  sendClubValidated,
  sendSubscriptionReceipt,
  sendSubscriptionReminder,
  sendSubscriptionSuspended,
};
