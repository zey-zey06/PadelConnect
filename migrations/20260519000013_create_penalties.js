/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('penalties', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('type', ['club_ban', 'app_ban']).notNullable();
    // null for app_ban (cross-tenant); set for club_ban
    t.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.decimal('amount', 10, 2).nullable();
    t.boolean('paid').notNullable().defaultTo(false);
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);

    t.index('user_id');
    t.index('organization_id');
    t.index(['user_id', 'type', 'paid']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('penalties');
};
