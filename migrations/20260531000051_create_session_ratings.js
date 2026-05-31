exports.up = (knex) =>
  knex.schema.createTable('session_ratings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('rater_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('organisation').notNullable().checkBetween([1, 5]);
    t.integer('niveau').notNullable().checkBetween([1, 5]);
    t.integer('ambiance').notNullable().checkBetween([1, 5]);
    t.text('comment').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['session_id', 'rater_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('session_ratings');
