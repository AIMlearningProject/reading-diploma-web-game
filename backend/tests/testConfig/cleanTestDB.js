import db from '../../db/db.js'

// Every application table, in one statement so CASCADE can sort out the
// foreign keys between them.
export const TEST_TABLES = [
    'rewards',
    'submissions',
    'transfer_requests',
    'teacher_invites',
    'progress',
    'books',
    'federated_credentials',
    'users'
].join(', ')

/**
 * Put the test database back to the fixture state. Called before every test.
 *
 * This truncates rather than rolling the migrations back and forward: rolling
 * back fails as soon as a test has inserted a book, because the down migration
 * of 20260826113911_remove_books_coverimage re-adds `coverimage` as NOT NULL
 * and the existing rows have no value for it.
 */
export async function resetDB() {
    await db.raw(`TRUNCATE TABLE ${TEST_TABLES} RESTART IDENTITY CASCADE`)
    await db.seed.run({ specific: 'users_seed.js' })
}
