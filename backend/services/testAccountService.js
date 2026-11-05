import db from '../db/db.js'
import logger from '../utils/logger.js'
import { STUDENTS, TEACHER_BOOKS, writeStudentState } from '../db/seeds/data/testStudents.js'

// Only for the public test period: the accounts on the student login page are
// shared, so each visitor should find them as the seed left them. Remove this
// service when the period ends, see "Test period" in CLAUDE.md.

// connect-pg-simple's default ttl: a session's `expire` is its last request plus this
const SESSION_TTL_SECONDS = 24 * 60 * 60
// A session with a request this recent counts as someone still playing
const IN_USE_SECONDS = 30 * 60

const isEnabled = () => process.env.TEST_ACCOUNT_RESET === 'true'

const isInUse = async (userId) => {
    const row = await db('session')
        .whereRaw('sess->\'passport\'->>\'user\' = ?', [String(userId)])
        .whereRaw('expire > now() + make_interval(secs => ?)', [SESSION_TTL_SECONDS - IN_USE_SECONDS])
        .first('sid')
    return Boolean(row)
}

const reset = async (user) => {
    const student = STUDENTS.find((entry) => entry.name === user.test_account)

    await db.transaction(async (trx) => {
        const teacherBooks = await trx('books')
            .where({ added_by: user.teacher_id })
            .whereIn('title', TEACHER_BOOKS.map((book) => book.title))
            .select('id', 'title')
        const bookByTitle = new Map(teacherBooks.map((book) => [book.title, book]))
        const books = TEACHER_BOOKS.map((book) => bookByTitle.get(book.title) ?? null)

        await trx('users').where({ id: user.id }).update({
            name: student.name,
            email: student.email,
            avatar: '',
            grade: student.grade,
            currently_reading: student.readingBook === undefined ? null : books[student.readingBook]?.id ?? null
        })
        // A changed email can link a Google account to the test account
        await trx('federated_credentials').where({ user_id: user.id }).del()
        await trx('books')
            .where({ added_by: user.id })
            .whereNotIn('title', (student.addedBooks ?? []).map((book) => book.title))
            .del()

        await writeStudentState(trx, { studentId: user.id, student, books })
    })
}

const TestAccountService = {
    /**
     * Puts a public test account back to its seeded state, unless someone is
     * still using it. Called on logout, and before login for the visitor who
     * closed the tab without logging out. Never throws: a failed reset must not
     * stop anyone from logging in or out.
     */
    async resetIfUnused(userId) {
        if (!isEnabled()) return

        try {
            const user = await db('users').where({ id: userId }).first('id', 'teacher_id', 'test_account')
            if (!user?.test_account || await isInUse(userId)) return
            await reset(user)
        } catch (error) {
            logger.error(`Resetting test account ${userId} failed: ${error.message}`)
        }
    }
}

export default TestAccountService
