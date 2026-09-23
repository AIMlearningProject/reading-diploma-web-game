import bcrypt from 'bcrypt'

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
const LEVEL_COUNT = 8

// Level number -> continent, mirrors mapOrder in frontend/src/game/state.js
const MAP_ORDER = [
    'ArcticMap',
    'EuropeMap',
    'AsiaMap',
    'NorthAmericaMap',
    'SouthAmericaMap',
    'AfricaMap',
    'OceaniaMap',
    'AntarcticaMap'
]

const QUESTIONS = [
    'Mikä oli kirjan mieleenpainuvin hetki?',
    'Kenestä henkilöhahmosta pidit eniten ja miksi?',
    'Mitä opit tästä kirjasta?'
]

const ANSWERS = [
    'Kohta jossa päähenkilö uskalsi vihdoin lähteä matkaan.',
    'Pidin eniten pikkusiskosta, koska hän ei luovuttanut koskaan.',
    'Opin että kannattaa pyytää apua, vaikka se tuntuisi vaikealta.'
]

// Books added by the main test teacher. page_count is only set for physical
// books, matching how the AddBook form treats e-books and audio books.
const TEACHER_BOOKS = [
    { title: 'Taikurin hattu', author: 'Tove Jansson', booktype: 'physical', page_count: 180 },
    { title: 'Muumipappa ja meri', author: 'Tove Jansson', booktype: 'physical', page_count: 220 },
    { title: 'Vaarallinen juhannus', author: 'Tove Jansson', booktype: 'physical', page_count: 160 },
    { title: 'Ronja, ryövärintytär', author: 'Astrid Lindgren', booktype: 'physical', page_count: 230 },
    { title: 'Veljeni Leijonamieli', author: 'Astrid Lindgren', booktype: 'physical', page_count: 200 },
    { title: 'Peppi Pitkätossu', author: 'Astrid Lindgren', booktype: 'physical', page_count: 160 },
    { title: 'Tirlittan', author: 'Oiva Paloheimo', booktype: 'physical', page_count: 150 },
    { title: 'Vinski ja Vinsentti', author: 'Oiva Paloheimo', booktype: 'physical', page_count: 140 },
    { title: 'Poika ja varis', author: 'Aapeli', booktype: 'physical', page_count: 170 },
    { title: 'Pikku Pietarin piha', author: 'Aapeli', booktype: 'physical', page_count: 190 },
    { title: 'Koiramäen lapset', author: 'Mauri Kunnas', booktype: 'physical', page_count: 48 },
    { title: 'Herra Hakkarainen', author: 'Mauri Kunnas', booktype: 'physical', page_count: 32 },
    { title: 'Risto Räppääjä', author: 'Sinikka Nopola & Tiina Nopola', booktype: 'physical', page_count: 120 },
    { title: 'Ella ja kaverit', author: 'Timo Parvela', booktype: 'physical', page_count: 110 },
    { title: 'Kiljusen herrasväki', author: 'Jalmari Finne', booktype: 'physical', page_count: 210 },
    { title: 'Hobitti', author: 'J.R.R. Tolkien', booktype: 'physical', page_count: 310 },
    { title: 'Tatu ja Patu Helsingissä', author: 'Aino Havukainen & Sami Toivonen', booktype: 'e-book', page_count: null },
    { title: 'Kirahviäiti ja muita hölmöjä aikuisia', author: 'Alexandra Salmela', booktype: 'e-book', page_count: null },
    { title: 'Me Rosvolat', author: 'Siri Kolu', booktype: 'e-book', page_count: null },
    { title: 'Onnenpäivä', author: 'Siri Kolu', booktype: 'e-book', page_count: null },
    { title: 'Kuka lohduttaisi Nyytiä?', author: 'Tove Jansson', booktype: 'audio', page_count: null },
    { title: 'Sinisiipi', author: 'Anni Swan', booktype: 'audio', page_count: null },
    { title: 'Heinähattu ja Vilttitossu', author: 'Sinikka Nopola & Tiina Nopola', booktype: 'audio', page_count: null },
    { title: 'Konsta', author: 'Veikko Huovinen', booktype: 'audio', page_count: null }
]

// Added by a student, to check that /api/books/my-books returns books added by
// the whole class and not just by the teacher.
const STUDENT_BOOKS = [
    { title: 'Lumikuningatar', author: 'H. C. Andersen', booktype: 'physical', page_count: 64 },
    { title: 'Tatun ja Patun Suomi', author: 'Aino Havukainen & Sami Toivonen', booktype: 'physical', page_count: 56 }
]

// Added by the second teacher; must NOT show up for the first teacher's class.
const OTHER_TEACHER_BOOKS = [
    { title: 'Maresi', author: 'Maria Turtschaninoff', booktype: 'physical', page_count: 280 },
    { title: 'Sudenmorsian', author: 'Aino Kallas', booktype: 'e-book', page_count: null }
]

/**
 * Students of the main test teacher, each covering one state the UI has to
 * handle. `levels` only lists the entries that differ from the default
 * (incomplete, 0 %, no book). `book` is an index into TEACHER_BOOKS.
 */
const STUDENTS = [
    {
        name: 'student',
        password: 'student',
        grade: 3,
        email: null,
        // Matches the credentials printed on the student login page.
        levels: []
    },
    {
        name: 'Aino',
        password: 'Test123!',
        grade: 4,
        email: 'aino@lukudiplomi.test',
        // Two levels done, third one halfway through.
        levels: [
            { level: 1, status: 'reviewed', progress: 100, book: 0, submission: true, reward: true },
            { level: 2, status: 'complete', progress: 100, book: 3, submission: true, reward: true },
            { level: 3, status: 'incomplete', progress: 40, book: 16 }
        ],
        readingBook: 16
    },
    {
        name: 'Väinö',
        password: 'Test123!',
        grade: 5,
        email: null,
        // Level 1 submitted and waiting for the teacher to accept it.
        levels: [
            { level: 1, status: 'complete', progress: 100, book: 12, submission: true, reward: true },
            { level: 2, status: 'incomplete', progress: 15, book: 20 }
        ],
        readingBook: 20
    },
    {
        name: 'Sofia',
        password: 'Test123!',
        grade: 4,
        email: null,
        // Level 1 sent back by the teacher: has a submission but is not complete,
        // which is what the game reads as "pending resubmission".
        levels: [
            { level: 1, status: 'resubmit', progress: 100, book: 6, submission: true }
        ],
        readingBook: 6
    },
    {
        name: 'Onni',
        password: 'Test123!',
        grade: 6,
        email: 'onni@lukudiplomi.test',
        // Whole diploma finished: every level reviewed, every minigame unlocked.
        levels: MAP_ORDER.map((_, i) => ({
            level: i + 1,
            status: 'reviewed',
            progress: 100,
            book: i,
            submission: true,
            reward: true
        }))
    }
]

// Student of the second teacher, so a transfer request has something to move.
const OTHER_STUDENTS = [
    { name: 'Elias', password: 'Test123!', grade: 3, email: null, levels: [] }
]

async function insertStudent(knex, { student, teacherId, books }) {
    const [row] = await knex('users')
        .insert({
            email: student.email,
            name: student.name,
            password_hash: student.passwordHash,
            avatar: '',
            currently_reading: student.readingBook === undefined ? null : books[student.readingBook].id,
            grade: student.grade,
            role: 'student',
            teacher_id: teacherId
        })
        .returning('id')

    const studentId = row.id
    const overrides = new Map(student.levels.map((entry) => [entry.level, entry]))

    // Every student gets one progress entry per level, the same way
    // POST /api/users/students does it.
    const progressRows = []
    for (let level = 1; level <= LEVEL_COUNT; level++) {
        const override = overrides.get(level)
        const book = override?.book === undefined ? null : books[override.book]
        progressRows.push({
            level,
            user: studentId,
            book: book ? book.id : null,
            book_title: book ? book.title : null,
            current_progress: override?.progress ?? 0,
            level_status: override?.status ?? 'incomplete'
        })
    }
    const inserted = await knex('progress').insert(progressRows).returning(['id', 'level'])
    const progressIdByLevel = new Map(inserted.map((row) => [row.level, row.id]))

    // submissions.completedLevel holds the PROGRESS ROW ID, not the level
    // number — see frontend/src/services/api.js (submitQuiz) and
    // StudentManager.jsx, which matches it against progressEntry.id.
    const submissions = student.levels
        .filter((entry) => entry.submission)
        .map((entry) => ({
            user: studentId,
            completedLevel: progressIdByLevel.get(entry.level),
            question1: QUESTIONS[0], answer1: ANSWERS[0],
            question2: QUESTIONS[1], answer2: ANSWERS[1],
            question3: QUESTIONS[2], answer3: ANSWERS[2]
        }))
    if (submissions.length > 0) await knex('submissions').insert(submissions)

    // CelebrationModal awards reward_type 'minigame' with the mapKey as name.
    const rewards = student.levels
        .filter((entry) => entry.reward)
        .map((entry) => ({
            owner: studentId,
            reward_type: 'minigame',
            name: MAP_ORDER[entry.level - 1]
        }))
    if (rewards.length > 0) await knex('rewards').insert(rewards)

    return studentId
}

export async function seed(knex) {
    // Wipes all application data and resets the id sequences so the test set is
    // reproducible. CASCADE is needed because of the foreign keys between them.
    await knex.raw(`
        TRUNCATE TABLE
            rewards, submissions, transfer_requests, teacher_invites,
            progress, books, federated_credentials, users
        RESTART IDENTITY CASCADE
    `)

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
        .insert(STUDENT_BOOKS.map((book) => ({ ...book, added_by: aino.id })))

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
