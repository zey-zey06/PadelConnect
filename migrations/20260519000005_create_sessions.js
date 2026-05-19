/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('creator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('date').notNullable();
    t.time('time').notNullable();
    t.integer('max_players').notNullable().defaultTo(4);
    t.integer('current_players').notNullable().defaultTo(0);
    t.enu('status', ['open', 'complete', 'cancelled']).notNullable().defaultTo('open');
    t.jsonb('preferences').nullable().defaultTo('{}');
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();

    t.index('creator_id');
    t.index('date');
    t.index('status');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('sessions');
};
