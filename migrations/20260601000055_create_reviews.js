exports.up = (knex) =>
  knex.schema.createTable('reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('target_id').notNullable();
    t.string('target_type', 20).notNullable(); // 'club' | 'player'
    t.integer('rating').notNullable();          // 1–5
    t.text('comment').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['target_id', 'target_type']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('reviews');
