import 'dotenv/config'
import db from '../../db/db.js'
import { TEST_TABLES } from './cleanTestDB.js'

// Runs once, before any test file. The database itself is created by the
// pretest script (scripts/createDatabase.js with NODE_ENV=test).
export default async function globalSetup() {
    try {
        await db.migrate.latest()
        await db.raw(`TRUNCATE TABLE ${TEST_TABLES} RESTART IDENTITY CASCADE`)
        await db.seed.run({ specific: 'users_seed.js' })
    } finally {
        await db.destroy()
    }
}
