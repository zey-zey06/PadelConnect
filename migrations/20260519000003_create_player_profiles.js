/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('player_profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.integer('level').nullable().checkBetween([1, 7]);
    t.string('style', 100).nullable();
    t.jsonb('strengths').nullable().defaultTo('[]');
    t.jsonb('weaknesses').nullable().defaultTo('[]');
    t.text('description').nullable();
    t.string('photo_url', 500).nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTable('player_profiles');
};
