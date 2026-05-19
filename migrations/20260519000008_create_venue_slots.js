/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('venue_slots', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE');
    t.date('date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.decimal('price', 10, 2).notNullable().defaultTo(0);
    t.enu('status', ['available', 'booked', 'cancelled']).notNullable().defaultTo('available');
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index('venue_id');
    t.index(['venue_id', 'date']);
    t.index('status');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('venue_slots');
};
