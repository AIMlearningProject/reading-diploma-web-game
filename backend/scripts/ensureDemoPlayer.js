import bcrypt from 'bcrypt'
import db from '../db/db.js'
import Progress from '../models/progress.js'
import { LEVEL_COUNT, NODES_PER_CONTINENT } from '../utils/diplomaConfig.js'

// Makes sure the development database holds a student who is one step away from
// the Afrikka puzzle scene (S6 Paljas rinne), so it can be solved live in a demo:
// every Afrikka book is read and accepted, all four items are in the backpack,
// and the scene itself is still unsolved. DELFIININ REITTI is unlocked as well,
// so a second scene game can be shown on the dashboard.
//
// Like `npm run db:testplayer` this never truncates anything. Run it again after
// a rehearsal and the scene is unsolved again:
//
//     npm run db:demoplayer
//
// Needs the teacher `teacher` from the test seed and the diploma catalogue
// (`npm run db:seed:diploma`) to exist.

const TEACHER_NAME = 'teacher'
const STUDENT_NAME = 'Esittely'
const STUDENT_PASSWORD = 'Test123!'
const SALT_ROUNDS = 12
const AVATAR = 'buddy_1'
// Grade 5 reads from the 5-6 catalogue, where Afrikka is "Elämää tässä ja nyt".
const GRADE = 5

// Afrikka is level 6 (ReadingState.mapOrder in frontend/src/game/state.js).
const DEMO_LEVEL = 6
const DEMO_MAP_KEY = 'AfricaMap'
// The four books read on Afrikka, by catalogue external_key so a reseed that
// renumbers the books does not break this. `title` is what the pupil says they read.
const DEMO_BOOKS = [
    { key: 'df28ea759cc3', title: 'Sirpale' },
    { key: '9374557238db', title: 'Kaksoisolennot' },
    { key: '062127d7ed4c', title: 'Neropatin päiväkirja 1' },
    { key: 'f2e12f5ffdca', title: 'Ihme' }
]
// reward_type 'item', name = the item id in frontend/src/game/data/items.js.
// All four, so a wrong item can be tried before the right one.
const ITEMS = ['kaukoputki', 'siemenpussi', 'simpukkapilli', 'mela']
// reward_type 'scene-game', name = the game id in frontend/src/game/data/miniGames.js.
// Never 'siemensade': that is the record that S6 is solved.
const SCENE_GAMES = ['delfiinin-reitti']

async function main() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing to create a test account in production.')
    }

    const teacher = await db('users').where({ name: TEACHER_NAME, role: 'teacher' }).first()
    if (!teacher) {
        throw new Error(
            `No teacher named "${TEACHER_NAME}". Run \`npm run db:seed:test\` first (it wipes the dev data).`
        )
    }

    const books = await db('books')
        .where({ source: 'diploma' })
        .whereIn('external_key', DEMO_BOOKS.map((book) => book.key))
        .select('id', 'external_key')
    const bookIdByKey = Object.fromEntries(books.map((book) => [book.external_key, book.id]))
    const missing = DEMO_BOOKS.filter((book) => !bookIdByKey[book.key])
    if (missing.length > 0) {
        throw new Error('Diploma catalogue books missing. Run `npm run db:seed:diploma` first.')
    }

    const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, SALT_ROUNDS)

    const studentId = await db.transaction(async (trx) => {
        let student = await trx('users').where({ name: STUDENT_NAME, teacher_id: teacher.id }).first()
        if (student) {
            await trx('users').where({ id: student.id })
                .update({ password_hash: passwordHash, avatar: AVATAR, grade: GRADE, currently_reading: null })
        } else {
            [student] = await trx('users')
                .insert({
                    email: null,
                    name: STUDENT_NAME,
                    password_hash: passwordHash,
                    avatar: AVATAR,
                    grade: GRADE,
                    role: 'student',
                    teacher_id: teacher.id
                })
                .returning('*')
        }

        // Start from a clean route on every level, then fill in Afrikka. Deleting
        // progress cascades to level_nodes; submissions point at progress, so they go first.
        await trx('submissions').where({ user: student.id }).del()
        await trx('progress').where({ user: student.id }).del()
        for (let level = 1; level <= LEVEL_COUNT; level++) {
            const [created] = await Progress.create(
                { level, user: student.id, book: null, current_progress: 0, level_status: 'incomplete' },
                trx
            )
            await Progress.createNodes(created.id, NODES_PER_CONTINENT, trx)
        }

        const demoLevel = await trx('progress').where({ user: student.id, level: DEMO_LEVEL }).first()
        for (const [index, book] of DEMO_BOOKS.entries()) {
            await trx('level_nodes')
                .where({ progress_id: demoLevel.id, node_index: index + 1 })
                .update({ book: bookIdByKey[book.key], book_title: book.title, current_progress: 100 })
        }
        // 'reviewed' with an accepted submission: the quiz never pops up during the
        // demo, and GET /api/submissions does not 404 and hide the dashboard rewards.
        const lastBook = DEMO_BOOKS.at(-1)
        await trx('progress').where({ id: demoLevel.id }).update({
            level_status: 'reviewed',
            current_progress: 100,
            book: bookIdByKey[lastBook.key],
            book_title: lastBook.title
        })
        // submissions.completedLevel holds the progress row id, not the level number.
        await trx('submissions').insert({
            user: student.id,
            completedLevel: demoLevel.id,
            question1: 'Mikä oli kirjan mieleenpainuvin hetki?',
            answer1: 'Kun päähenkilö kertoi vihdoin totuuden ystävälleen.',
            question2: 'Kenestä henkilöhahmosta pidit eniten ja miksi?',
            answer2: 'Pidin päähenkilöstä, koska hän oli rohkea, vaikka pelkäsi.',
            question3: 'Mitä opit tästä kirjasta?',
            answer3: 'Opin, että erilaisuus ei ole huono asia.'
        })

        // Finishing a continent earns its tile puzzle (reward_type 'minigame', name =
        // mapKey, as CelebrationModal writes it).
        await trx('rewards').where({ owner: student.id }).del()
        await trx('rewards').insert([
            { owner: student.id, reward_type: 'minigame', name: DEMO_MAP_KEY },
            ...ITEMS.map((name) => ({ owner: student.id, reward_type: 'item', name })),
            ...SCENE_GAMES.map((name) => ({ owner: student.id, reward_type: 'scene-game', name }))
        ])

        return student.id
    })

    console.log(`Demo player ready (user id ${studentId}).`)
    console.log(`  login page : /login/student`)
    console.log(`  teacher    : ${TEACHER_NAME}`)
    console.log(`  student    : ${STUDENT_NAME}`)
    console.log(`  password   : ${STUDENT_PASSWORD}`)
    console.log(`  state      : Afrikka read and accepted, ${ITEMS.length} items, ${SCENE_GAMES.join(', ')} unlocked, S6 Paljas rinne unsolved`)
}

try {
    await main()
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
} finally {
    await db.destroy()
}
