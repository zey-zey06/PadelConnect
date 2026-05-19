require('dotenv').config();

/** @type {import('knex').Knex.Config} */
const base = {
  client: 'pg',
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

module.exports = {
  development: {
    ...base,
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'padelconnect',
      password: 'padelconnect',
      database: 'padelconnect_dev',
    },
    pool: { min: 2, max: 10 },
  },

  test: {
    ...base,
    connection: process.env.TEST_DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'padelconnect',
      password: 'padelconnect',
      database: 'padelconnect_test',
    },
    pool: { min: 1, max: 5 },
  },

  production: {
    ...base,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 20 },
  },
};
