/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('booking_addons', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    t.enu('type', ['coach', 'ball_picker']).notNullable();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.decimal('price', 10, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.index('booking_id');
    t.index('user_id');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('booking_addons');
};
