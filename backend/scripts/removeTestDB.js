import pg from 'pg'
import 'dotenv/config'
import logger from '../utils/logger.js'

// Drops the integration test database again after the tests have run.
// Only ever runs under NODE_ENV=test, so it cannot touch the development database.

const { Client } = pg

async function dropDatabase() {
    if (process.env.NODE_ENV !== 'test') {
        logger.info('Not in the test environment, nothing to drop.')
        return
    }

    const client = new Client({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres'
    })

    await client.connect()

    const dbName = process.env.INTEGRATION_TEST_DB_NAME || 'rdiplomatestintegration'

    const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
    )

    if (result.rowCount > 0) {
        logger.info(`Database "${dbName}" exists. Dropping...`)

        // Terminate active connections first, or the DROP is refused
        await client.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1
        `, [dbName])

        await client.query(`DROP DATABASE ${dbName}`)
        logger.info(`Database "${dbName}" dropped.`)
    } else {
        logger.info(`Database "${dbName}" does not exist.`)
    }

    await client.end()
}

await dropDatabase().catch((err) => {
    logger.error(err)
    process.exit(1)
})
