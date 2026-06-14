exports.up = function (knex) {
  return knex.schema.createTable('team_members', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 20).defaultTo('staff'); // admin | manager | staff
    table.string('status', 20).defaultTo('pending'); // pending | active
    table.uuid('invited_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('invite_email', 255);
    table.string('invite_token', 100);
    table.timestamp('invite_expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('team_members');
};
