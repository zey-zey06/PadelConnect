exports.up = (knex) =>
  knex.schema.createTable('push_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('endpoint').notNullable();
    t.text('p256dh').notNullable();
    t.text('auth').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'endpoint']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('push_subscriptions');
