/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('booking_addons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    table.string('type').notNullable();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.decimal('price', 10, 2).notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('booking_addons');
};
