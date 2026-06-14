const cron = require('node-cron');
const db   = require('../db');
const notifService = require('../features/notifications/notifications.service');

/**
 * Find all sessions that ended today or earlier, haven't been cancelled,
 * and haven't yet received a session_ended notification for their creator.
 * Send one notification to the organizer (score entry) and one to each
 * confirmed participant (feedback request).
 */
async function runSessionEndNotifications() {
  const today = new Date().toISOString().slice(0, 10);

  // Sessions that ended (date <= today, not cancelled, not yet notified)
  const sessions = await db('sessions')
    .where('sessions.date', '<=', today)
    .whereNotIn('sessions.status', ['cancelled'])
    .whereNull('sessions.deleted_at')
    // Exclude sessions where the creator already got a session_ended notif
    .whereNotExists(
      db('notifications')
        .where('notifications.type', 'session_ended')
        .whereRaw('notifications.user_id = sessions.creator_id')
        .whereRaw("notifications.message ILIKE '%' || sessions.id::text || '%'")
    )
    .select('sessions.id', 'sessions.creator_id', 'sessions.date', 'sessions.time');

  for (const session of sessions) {
    try {
      const dateStr = session.date?.toString().slice(0, 10) ?? '';
      const timeStr = session.time?.slice(0, 5) ?? '';

      // Notify organizer → score entry
      await notifService.createNotification(
        session.creator_id,
        'session_ended',
        `Votre session du ${dateStr} à ${timeStr} est terminée ! Entrez le score final. [session:${session.id}]`,
      );

      // Notify confirmed participants → feedback
      const participants = await db('session_requests')
        .where({ session_id: session.id, status: 'accepted' })
        .whereNull('deleted_at')
        .pluck('player_id');

      await Promise.allSettled(participants.map((pid) =>
        notifService.createNotification(
          pid,
          'session_ended',
          `Comment s'est passée votre session du ${dateStr} ? Donnez votre avis ! [session:${session.id}]`,
        ),
      ));
    } catch (err) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'session-end notification failed',
        session_id: session.id,
        error: err.message,
      }));
    }
  }
}

// Runs every day at 21:00 UTC
cron.schedule('0 21 * * *', () => {
  runSessionEndNotifications().catch((err) => {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'session-end cron failed',
      error: err.message,
    }));
  });
});
