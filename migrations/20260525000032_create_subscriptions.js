exports.up = function (knex) {
  return knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.string('plan', 50).notNullable().defaultTo('venue_monthly');
    table.decimal('amount', 14, 2).notNullable();
    table.integer('venue_count').notNullable().defaultTo(1);
    table.string('status', 20).notNullable().defaultTo('active');
    table.string('payment_method', 50);
    table.timestamp('current_period_start').notNullable();
    table.timestamp('current_period_end').notNullable();
    table.timestamp('paid_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('organization_id');
    table.index(['status', 'current_period_end']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('subscriptions');
};
