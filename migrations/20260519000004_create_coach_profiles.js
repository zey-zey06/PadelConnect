/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('coach_profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // nullable: independent coaches are not tied to a club
    t.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    t.string('specialty', 255).nullable();
    t.decimal('rate', 10, 2).nullable();
    t.text('bio').nullable();
    t.boolean('is_independent').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index('user_id');
    t.index('organization_id');
    t.index('is_independent');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('coach_profiles');
};
