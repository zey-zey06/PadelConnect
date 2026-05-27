const { sendEmail, FROM } = require('./mailer');

/**
 * Send a session reminder email to a player.
 *
 * @param {object} params
 * @param {string} params.userEmail   - Recipient email
 * @param {object} params.session     - { date, time }
 * @param {object} params.venue       - { name, description }
 * @param {number} params.playerCount - Current number of confirmed players
 * @param {string|null} params.coachEmail - Coach email if a coach is booked, null otherwise
 */
async function sendSessionReminder({ userEmail, session, venue, playerCount, coachEmail }) {
  await sendEmail({
    from:    FROM,
    to:      userEmail,
    subject: 'Rappel : votre session padel demain 🎾',
    html: `
      <h1>Rappel de session</h1>
      <p>Vous avez une session padel <strong>demain</strong> !</p>
      <ul>
        <li><strong>Date :</strong> ${session.date}</li>
        <li><strong>Heure :</strong> ${session.time}</li>
        <li><strong>Lieu :</strong> ${venue.name}${venue.description ? ` — ${venue.description}` : ''}</li>
        <li><strong>Joueurs confirmés :</strong> ${playerCount}</li>
        ${coachEmail ? `<li><strong>Coach :</strong> ${coachEmail}</li>` : ''}
      </ul>
      <p>À demain sur le terrain !</p>
    `,
  });
}

module.exports = { sendSessionReminder };
