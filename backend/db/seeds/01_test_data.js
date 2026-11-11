import bcrypt from 'bcrypt'
import { seed as seedDiplomaBooks } from './00_diploma_books.js'
import { STUDENTS, TEACHER_BOOKS, insertStudent } from './data/testStudents.js'

/**
 * Development test data.
 *
 * WARNING: this TRUNCATEs every application table. Never run it against a
 * database you care about. Run it with:
 *
 *     npm run db:seed:test
 *     (or: npx knex seed:run --specific=01_test_data.js)
 *
 * A plain `npx knex seed:run` would also run users_seed.js, which is the
 * integration tests' fixture set and would replace these users. Always pass
 * --specific, which is what the npm script above does.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const SALT_ROUNDS = 12

// Added by the second teacher; must NOT show up for the first teacher's class.
const OTHER_TEACHER_BOOKS = [
    { title: 'Maresi', author: 'Maria Turtschaninoff', booktype: 'physical', page_count: 280 },
    { title: 'Sudenmorsian', author: 'Aino Kallas', booktype: 'e-book', page_count: null }
]

// Student of the second teacher, so a transfer request has something to move.
const OTHER_STUDENTS = [
    { name: 'Elias', password: 'Test123!', grade: 3, email: null, levels: [] }
]

export async function seed(knex) {
    // Wipes all application data and resets the id sequences so the test set is
    // reproducible. CASCADE is needed because of the foreign keys between them.
    await knex.raw(`
        TRUNCATE TABLE
            rewards, submissions, transfer_requests, teacher_invites,
            level_nodes, progress, books, diploma_continents,
            federated_credentials, users
        RESTART IDENTITY CASCADE
    `)

    // The TRUNCATE above wipes the diploma catalogue too, so put it back before
    // anything references a book.
    await seedDiplomaBooks(knex)

    const [teacherHash, studentHash, testHash] = await Promise.all([
        bcrypt.hash('teacher', SALT_ROUNDS),
        bcrypt.hash('student', SALT_ROUNDS),
        bcrypt.hash('Test123!', SALT_ROUNDS)
    ])
    const hashFor = (password) => {
        if (password === 'teacher') return teacherHash
        if (password === 'student') return studentHash
        return testHash
    }

    const [teacher] = await knex('users')
        .insert({
            email: 'teacher@lukudiplomi.test',
            name: 'teacher',
            password_hash: teacherHash,
            avatar: '',
            grade: 1,
            role: 'teacher'
        })
        .returning(['id', 'name'])

    const [otherTeacher] = await knex('users')
        .insert({
            email: 'virtanen@lukudiplomi.test',
            name: 'Virtanen',
            password_hash: testHash,
            avatar: '',
            grade: 1,
            role: 'teacher'
        })
        .returning(['id', 'name'])

    const teacherBooks = await knex('books')
        .insert(TEACHER_BOOKS.map((book) => ({ ...book, added_by: teacher.id })))
        .returning(['id', 'title'])

    await knex('books')
        .insert(OTHER_TEACHER_BOOKS.map((book) => ({ ...book, added_by: otherTeacher.id })))

    for (const student of STUDENTS) {
        student.passwordHash = hashFor(student.password)
        student.id = await insertStudent(knex, { student, teacherId: teacher.id, books: teacherBooks })
    }

    for (const student of OTHER_STUDENTS) {
        student.passwordHash = hashFor(student.password)
        student.id = await insertStudent(knex, { student, teacherId: otherTeacher.id, books: teacherBooks })
    }

    // Books added by a student show up in their whole class's book list.
    const aino = STUDENTS.find((student) => student.name === 'Aino')
    await knex('books')
        .insert(aino.addedBooks.map((book) => ({ ...book, added_by: aino.id })))

    // Invite links: one per teacher, so the sign-up page has something to accept.
    // The token itself is minted by the backend at request time, so open the
    // teacher dashboard to copy a working link.
    await knex('teacher_invites').insert([
        { teacher_id: teacher.id, invite_secret: 'seeded_invite_secret_for_test_teacher', active: true, expires_at: null },
        { teacher_id: otherTeacher.id, invite_secret: 'seeded_invite_secret_for_other_teacher', active: true, expires_at: null }
    ])

    // A pending transfer request waiting in the main teacher's dashboard.
    await knex('transfer_requests').insert({
        requester_teacher_id: otherTeacher.id,
        recipient_teacher_id: teacher.id,
        status: 'pending',
        message: 'Siirtyisivätkö oppilaani sinun ryhmääsi ensi lukukaudeksi?',
        student_count: OTHER_STUDENTS.length
    })
}
