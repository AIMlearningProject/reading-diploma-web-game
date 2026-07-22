import 'dotenv/config'

// npx knex migrate:status --> to check for any migrations
// npx knex migrate:latest --> to run all new migrations
// npx knex migrate:rollback --> to rollback last migration
// npx knex migrate:rollback --all --> to rollback all migrations
// npm run db:make migration_name_here --> to create a new migration file (fit with the ES module)
// npm run db:seed seed_name_here --> to create a new seed file (fit with the ES module) for filling tables with data

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const development = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'rdiploma',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
  },
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './db/seeds',
    tableName: 'knex_seeds'
  }
};

const staging = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },

  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './db/seeds',
    tableName: 'knex_seeds'
  }
}

const useConnectionString = Boolean(process.env.DATABASE_URL)

const production = {
  client: 'postgresql',
  connection: useConnectionString
    ? process.env.DATABASE_URL
    : {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'rdiploma',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432
    },
  /*pool: { min: 2, max: 10 },*/
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './db/seeds',
    tableName: 'knex_seeds'
  }
}

export default {
  development, staging, production
};