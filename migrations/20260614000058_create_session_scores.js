exports.up = (knex) =>
  knex.schema.createTable('session_scores', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    t.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('score_my_team').notNullable();
    t.integer('score_opponent').notNullable();
    // 'my_team' = reporter's team won | 'opponent' = opposing team won
    t.string('winner', 20).notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['session_id']); // one score entry per session
  });

exports.down = (knex) => knex.schema.dropTableIfExists('session_scores');
