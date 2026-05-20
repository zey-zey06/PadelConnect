const calendarRepo = require('./calendar.repository');

/**
 * Return the player's upcoming sessions grouped by date.
 *
 * Output shape:
 *   {
 *     "2026-05-24": [
 *       { session_id, date, time, session_status, current_players, max_players,
 *         booking_id, booking_status,
 *         slot: { start_time, end_time, price },
 *         venue: { id, name, description } },
 *       ...
 *     ],
 *     ...
 *   }
 */
async function getMyCalendar(userId) {
  const rows = await calendarRepo.getUpcomingForUser(userId);

  return rows.reduce((acc, row) => {
    // Normalise the date key — Knex may return a Date object for date columns
    const dateKey = row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date);

    if (!acc[dateKey]) acc[dateKey] = [];

    acc[dateKey].push({
      session_id:      row.session_id,
      date:            dateKey,
      time:            row.time,
      session_status:  row.session_status,
      current_players: row.current_players,
      max_players:     row.max_players,
      booking_id:      row.booking_id,
      booking_status:  row.booking_status,
      slot: {
        start_time: row.start_time,
        end_time:   row.end_time,
        price:      row.price,
      },
      venue: {
        id:          row.venue_id,
        name:        row.venue_name,
        description: row.venue_description,
      },
    });

    return acc;
  }, {});
}

module.exports = { getMyCalendar };
