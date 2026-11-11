import bcrypt from 'bcrypt'
import db from '../db/db.js'
import logger from '../utils/logger.js'
import { STUDENTS, TEACHER_BOOKS, insertStudent, writeStudentState } from '../db/seeds/data/testStudents.js'

// Only for the public test period, see "Test period" in CLAUDE.md, which says how
// to remove it. Two kinds of test account:
// - The pupils on the student login page are shared, so each visitor should find
//   them as the seed left them: they are reset.
// - A visitor who tries the teacher side gets a test teacher of their own with a
//   copy of the seeded class. Nobody else uses it, so it is deleted, not reset.

// connect-pg-simple's default ttl: a session's `expire` is its last request plus this
const SESSION_TTL_SECONDS = 24 * 60 * 60
// A session with a request this recent counts as someone still playing
const IN_USE_SECONDS = 30 * 60
// users.test_account of a visitor's test teacher is this prefix plus its creation
// time in ms, so the cleanup can leave alone one whose session is not saved yet.
const TEST_TEACHER_PREFIX = 'teacher:'
const NEW_TEST_TEACHER_SECONDS = 10 * 60

const isEnabled = () => process.env.TEST_ACCOUNT_RESET === 'true'
const isTestTeacher = (testAccount) => Boolean(testAccount?.startsWith(TEST_TEACHER_PREFIX))

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

// Students first: users.teacher_id is ON DELETE SET NULL, so deleting only the
// teacher would leave the class behind. Books, progress and the rest cascade.
const deleteTestTeachers = async (teacherIds, dbConn = db) => {
    if (teacherIds.length === 0) return
    await dbConn('users').whereIn('teacher_id', teacherIds).where({ role: 'student' }).del()
    await dbConn('users').whereIn('id', teacherIds).del()
}

// Test teachers whose visitor left without logging out: no session made a request
// in the last day, and old enough that a session is not still being saved.
const deleteAbandonedTestTeachers = async () => {
    const createdBefore = Date.now() - NEW_TEST_TEACHER_SECONDS * 1000
    const candidates = await db('users')
        .where('test_account', 'like', `${TEST_TEACHER_PREFIX}%`)
        .select('id', 'test_account')
    const old = candidates.filter((user) => Number(user.test_account.slice(TEST_TEACHER_PREFIX.length)) < createdBefore)
    if (old.length === 0) return

    const live = await db('session')
        .whereRaw('expire > now()')
        .whereRaw('sess->\'passport\'->>\'user\' = any(?)', [old.map((user) => String(user.id))])
        .select(db.raw('sess->\'passport\'->>\'user\' as user_id'))
    const liveIds = new Set(live.map((row) => Number(row.user_id)))
    await deleteTestTeachers(old.map((user) => user.id).filter((id) => !liveIds.has(id)))
}

let passwordHashes
const hashFor = async (password) => {
    // Hashed once per process: bcrypt takes a quarter of a second per password
    passwordHashes ??= Promise.all(
        [...new Set(STUDENTS.map((student) => student.password))]
            .map(async (plain) => [plain, await bcrypt.hash(plain, 12)])
    ).then((pairs) => new Map(pairs))
    return (await passwordHashes).get(password)
}

const freeTeacherName = async (trx) => {
    for (;;) {
        const name = `Testiopettaja ${Math.floor(1000 + Math.random() * 9000)}`
        // Pupils log in with their teacher's name, so it has to be unique among teachers
        const taken = await trx('users').where({ name, role: 'teacher' }).first('id')
        if (!taken) return name
    }
}

const TestAccountService = {
    /**
     * Puts a shared test pupil back to its seeded state, or deletes a visitor's
     * test teacher with its class, unless someone is still using the account.
     * Called on logout, and before login for the visitor who closed the tab
     * without logging out. Never throws: a failed reset must not stop anyone
     * from logging in or out.
     */
    async resetIfUnused(userId) {
        if (!isEnabled()) return

        try {
            const user = await db('users').where({ id: userId }).first('id', 'teacher_id', 'test_account')
            if (!user?.test_account || await isInUse(userId)) return
            if (isTestTeacher(user.test_account)) {
                await db.transaction((trx) => deleteTestTeachers([user.id], trx))
            } else {
                await reset(user)
            }
        } catch (error) {
            logger.error(`Resetting test account ${userId} failed: ${error.message}`)
        }
    },

    /**
     * Creates a test teacher for one visitor, with a copy of the seeded class:
     * the same pupils in the same states and the same books. It has no password
     * and no email, so the only way in is this call.
     */
    async createTestTeacher() {
        if (!isEnabled()) {
            const err = new Error('Test teachers are only available during the public test period')
            // Seen on a local dev server, where TEST_ACCOUNT_RESET is not set
            err.userDetails = 'Testiopettaja toimii vain testisivustolla.'
            err.status = 404
            throw err
        }

        try {
            await deleteAbandonedTestTeachers()
        } catch (error) {
            logger.error(`Deleting abandoned test teachers failed: ${error.message}`)
        }

        const hashes = new Map()
        for (const student of STUDENTS) hashes.set(student.password, await hashFor(student.password))

        return db.transaction(async (trx) => {
            const [teacher] = await trx('users')
                .insert({
                    name: await freeTeacherName(trx),
                    email: null,
                    password_hash: null,
                    avatar: '',
                    grade: 1,
                    role: 'teacher',
                    test_account: `${TEST_TEACHER_PREFIX}${Date.now()}`
                })
                .returning('*')

            const books = await trx('books')
                .insert(TEACHER_BOOKS.map((book) => ({ ...book, added_by: teacher.id })))
                .returning(['id', 'title'])

            for (const student of STUDENTS) {
                const studentId = await insertStudent(trx, {
                    student,
                    teacherId: teacher.id,
                    books,
                    passwordHash: hashes.get(student.password),
                    copy: true
                })
                if (student.addedBooks) {
                    await trx('books').insert(student.addedBooks.map((book) => ({ ...book, added_by: studentId })))
                }
            }

            return teacher
        })
    }
}

export default TestAccountService
