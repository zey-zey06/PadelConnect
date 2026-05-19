/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('no_show_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    t.enu('type', ['no_show', 'late_cancel']).notNullable();
    t.decimal('amount_due', 10, 2).notNullable().defaultTo(0);
    t.boolean('paid').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.index('user_id');
    t.index('booking_id');
    t.index(['user_id', 'paid']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('no_show_records');
};
