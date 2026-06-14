exports.up = async (knex) => {
  await knex.schema.createTable('sponsors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('tournament_id').nullable().references('id').inTable('tournaments').onDelete('SET NULL');
    t.string('name', 100).notNullable();
    t.text('logo_url').nullable();
    t.string('website_url', 500).nullable();
    t.decimal('amount', 15, 2).nullable();
    t.string('currency', 10).defaultTo('FCFA');
    t.enu('type', ['main', 'partner', 'media']).defaultTo('partner');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sponsors');
};
