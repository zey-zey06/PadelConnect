exports.up = async (knex) => {
  await knex.raw(`ALTER TABLE team_posts ALTER COLUMN type TYPE TEXT USING type::TEXT`);
  await knex.schema.alterTable('team_posts', (t) => {
    t.jsonb('metadata').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('team_posts', (t) => {
    t.dropColumn('metadata');
  });
};
