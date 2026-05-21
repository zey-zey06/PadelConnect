/**
 * Removes duplicate venue_slots rows (keeping the earliest per venue/date/start_time)
 * then adds a UNIQUE constraint to prevent future duplicates.
 *
 * Root cause: fillMissingSlots compared template start_times ('HH:MM') against
 * Postgres time values ('HH:MM:SS'), so the Set lookup always missed and re-inserted
 * every slot on each dev-server restart.
 */
exports.up = async function (knex) {
  await knex.raw(`
    DELETE FROM venue_slots
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY venue_id, date, start_time
                 ORDER BY created_at ASC
               ) AS rn
        FROM venue_slots
      ) ranked
      WHERE rn > 1
    )
  `);

  await knex.schema.alterTable('venue_slots', (table) => {
    table.unique(['venue_id', 'date', 'start_time'], 'venue_slots_venue_date_start_unique');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('venue_slots', (table) => {
    table.dropUnique(['venue_id', 'date', 'start_time'], 'venue_slots_venue_date_start_unique');
  });
};
