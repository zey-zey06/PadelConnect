const cron = require('node-cron');
const db = require('../db');
const { sendSessionReminder } = require('../emails/reminder');

/**
 * Fetch all confirmed bookings for sessions happening tomorrow and send
 * a reminder email to each player.  Per-booking errors are caught and
 * logged so that one bad address never blocks the rest of the batch.
 */
async function runReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const bookings = await db('bookings')
    .join('sessions',    'bookings.session_id',         'sessions.id')
    .join('venue_slots', 'bookings.venue_slot_id',       'venue_slots.id')
    .join('venues',      'venue_slots.venue_id',         'venues.id')
    .join('users',       'sessions.creator_id',          'users.id')
    .where('sessions.date', tomorrowDate)
    .where('bookings.status', 'confirmed')
    .whereNull('bookings.deleted_at')
    .whereNull('sessions.deleted_at')
    .select(
      'bookings.id as booking_id',
      'sessions.date as session_date',
      'sessions.time as session_time',
      'sessions.current_players',
      'venues.name as venue_name',
      'venues.description as venue_description',
      'users.email as user_email'
    );

  for (const booking of bookings) {
    try {
      // Look up a coach addon if one exists for this booking
      const coachAddon = await db('booking_addons')
        .join('users as cu', 'booking_addons.user_id', 'cu.id')
        .where('booking_addons.booking_id', booking.booking_id)
        .where('booking_addons.type', 'coach')
        .whereNull('booking_addons.deleted_at')
        .select('cu.email as coach_email')
        .first();

      await sendSessionReminder({
        userEmail: booking.user_email,
        session: {
          date: booking.session_date,
          time: booking.session_time,
        },
        venue: {
          name: booking.venue_name,
          description: booking.venue_description,
        },
        playerCount: booking.current_players,
        coachEmail: coachAddon ? coachAddon.coach_email : null,
      });
    } catch (err) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'Reminder email failed',
        booking_id: booking.booking_id,
        error: err.message,
      }));
    }
  }
}

// Runs every day at 20:00 UTC
cron.schedule('0 20 * * *', () => {
  runReminders().catch((err) => {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'Reminder cron job failed',
      error: err.message,
    }));
  });
});
