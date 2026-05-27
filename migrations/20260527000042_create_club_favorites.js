exports.up = async function (knex) {
  await knex.schema.createTable('club_favorites', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'organization_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('club_favorites');
};
