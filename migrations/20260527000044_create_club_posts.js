exports.up = async function (knex) {
  await knex.schema.createTable('club_posts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.text('content').notNullable();
    t.jsonb('photos').notNullable().defaultTo('[]');
    t.timestamps(true, true);
    t.index('organization_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('club_posts');
};
