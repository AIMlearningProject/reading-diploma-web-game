// Students and books shared by the development seed (01_test_data.js) and the
// reset of the public test accounts (services/testAccountService.js).

const LEVEL_COUNT = 8
// A continent is a route of NODE_COUNT nodes, one book each. Mirrors
// NODES_PER_CONTINENT in utils/diplomaConfig.js.
const NODE_COUNT = 4

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
export const TEACHER_BOOKS = [
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

/**
 * Students of the main test teacher, each covering one state the UI has to
 * handle. `levels` only lists the entries that differ from the default
 * (incomplete, 0 %, no book). `book` is an index into TEACHER_BOOKS.
 * `publicTestAccount` marks the ones offered on the student login page during the
 * public test period, which TestAccountService puts back to this state.
 */
export const STUDENTS = [
    {
        name: 'student',
        password: 'student',
        publicTestAccount: true,
        grade: 1,
        email: null,
        // Matches the credentials printed on the student login page.
        levels: []
    },
    {
        name: 'Aino',
        password: 'Test123!',
        publicTestAccount: true,
        addedBooks: STUDENT_BOOKS,
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
        grade: 7,
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
        publicTestAccount: true,
        grade: 9,
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

/**
 * Writes a student's progress, nodes, submissions and rewards from its `levels`
 * list. The seed calls it on a new student and TestAccountService on an existing
 * one, so a progress row that already exists is updated in place: a browser left
 * open keeps sending that row's id with its submission.
 *
 * @param { import("knex").Knex } knex
 * @param {{ studentId: number, student: object, books: Array<?object> }} options
 *     `books` is in TEACHER_BOOKS order. A null entry is a book that no longer exists.
 * @returns { Promise<void> }
 */
export async function writeStudentState(knex, { studentId, student, books }) {
    const overrides = new Map(student.levels.map((entry) => [entry.level, entry]))
    const existing = await knex('progress').where({ user: studentId }).select('id', 'level')
    const progressIdByLevel = new Map(existing.map((row) => [row.level, row.id]))

    // Every student gets one progress entry per level, the same way
    // POST /api/users/students does it.
    for (let level = 1; level <= LEVEL_COUNT; level++) {
        const override = overrides.get(level)
        const book = override?.book === undefined ? null : books[override.book]
        const row = {
            book: book ? book.id : null,
            book_title: book ? book.title : null,
            // Now means "how far through the whole continent", i.e. across all
            // NODE_COUNT books, not through one book.
            current_progress: override?.progress ?? 0,
            level_status: override?.status ?? 'incomplete'
        }
        if (progressIdByLevel.has(level)) {
            await knex('progress').where({ id: progressIdByLevel.get(level) }).update(row)
        } else {
            const [inserted] = await knex('progress').insert({ ...row, level, user: studentId }).returning('id')
            progressIdByLevel.set(level, inserted.id)
        }
    }

    await knex('level_nodes').whereIn('progress_id', [...progressIdByLevel.values()]).del()
    await knex('submissions').where({ user: studentId }).del()
    await knex('rewards').where({ owner: studentId }).del()

    // Nodes. A level the student has worked on spreads its progress across the
    // route: a finished level has all four nodes done, a half-read one has the
    // first node part-read. `book` is the same book on every node it fills,
    // which the game forbids, so each filled node takes a different book.
    const nodeRows = []
    for (let level = 1; level <= LEVEL_COUNT; level++) {
        const override = overrides.get(level)
        const levelPct = override?.progress ?? 0
        // How many nodes this level's percentage covers, and how far into the
        // next one it reaches.
        const done = Math.floor((levelPct * NODE_COUNT) / 100)
        const partial = Math.round(levelPct * NODE_COUNT - done * 100)

        for (let node_index = 1; node_index <= NODE_COUNT; node_index++) {
            const filled = node_index <= done || (node_index === done + 1 && partial > 0)
            // Walk forward through the book list so no two nodes share a book.
            const bookIndex = override?.book === undefined
                ? undefined
                : (override.book + node_index - 1) % books.length
            const book = filled && bookIndex !== undefined ? books[bookIndex] : null
            nodeRows.push({
                progress_id: progressIdByLevel.get(level),
                node_index,
                book: book ? book.id : null,
                book_title: book ? book.title : null,
                current_progress: node_index <= done ? 100 : (node_index === done + 1 ? partial : 0)
            })
        }
    }
    await knex('level_nodes').insert(nodeRows)

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
}
