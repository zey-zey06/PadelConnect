/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('coach_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.string('specialty').nullable();
    table.decimal('rate', 10, 2).nullable();
    table.text('bio').nullable();
    table.boolean('is_independent').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable('coach_profiles');
};
