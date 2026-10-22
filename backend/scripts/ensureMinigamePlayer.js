import bcrypt from 'bcrypt'
import db from '../db/db.js'
import Progress from '../models/progress.js'
import { LEVEL_COUNT, NODES_PER_CONTINENT } from '../utils/diplomaConfig.js'

// Makes sure the development database holds a student who has every mini-game
// unlocked, so the games can be tried on the real student dashboard.
//
// Unlike `npm run db:seed:test` this never truncates anything. It is safe to run
// any number of times: it only ever touches the one account below, and puts that
// account back into the same state. Run it with:
//
//     npm run db:testplayer
//
// Needs the teacher `teacher` from the test seed to exist, because a student logs
// in with the name of their teacher.

const TEACHER_NAME = 'teacher'
const STUDENT_NAME = 'Pelaaja'
const STUDENT_PASSWORD = 'Test123!'
const SALT_ROUNDS = 12
// A pupil with no buddy is shown the buddy picker first; this one starts on the real dashboard.
const AVATAR = 'buddy_1'

// reward_type 'minigame', name = the continent's mapKey, as CelebrationModal writes it
// (mirrors ReadingState.mapOrder in frontend/src/game/state.js).
const CONTINENT_GAMES = [
    'ArcticMap', 'EuropeMap', 'AsiaMap', 'NorthAmericaMap',
    'SouthAmericaMap', 'AfricaMap', 'OceaniaMap', 'AntarcticaMap'
]
// reward_type 'scene-game', name = the game id in frontend/src/game/data/miniGames.js
const SCENE_GAMES = ['koskimelonta', 'siemensade', 'delfiinin-reitti', 'jaaretki']
// reward_type 'item', name = the item id in frontend/src/game/data/items.js
const ITEMS = ['kaukoputki', 'siemenpussi', 'simpukkapilli', 'mela']

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

    const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, SALT_ROUNDS)

    const studentId = await db.transaction(async (trx) => {
        let student = await trx('users').where({ name: STUDENT_NAME, teacher_id: teacher.id }).first()
        if (student) {
            await trx('users').where({ id: student.id }).update({ password_hash: passwordHash, avatar: AVATAR })
        } else {
            [student] = await trx('users')
                .insert({
                    email: null,
                    name: STUDENT_NAME,
                    password_hash: passwordHash,
                    avatar: AVATAR,
                    grade: 5,
                    role: 'student',
                    teacher_id: teacher.id
                })
                .returning('*')
        }

        // A student without one progress row per level does not load in the game.
        const have = new Set((await Progress.findByUser(student.id, trx)).map((row) => row.level))
        for (let level = 1; level <= LEVEL_COUNT; level++) {
            if (have.has(level)) continue
            const [created] = await Progress.create(
                { level, user: student.id, book: null, current_progress: 0, level_status: 'incomplete' },
                trx
            )
            await Progress.createNodes(created.id, NODES_PER_CONTINENT, trx)
        }

        // GET /api/submissions answers 404 for a pupil who has none, and the dashboard
        // loads progress, rewards and submissions together, so with no submission it
        // never shows the rewards at all. Level 1 is therefore handed in and accepted.
        const levelOne = await trx('progress').where({ user: student.id, level: 1 }).first()
        await trx('progress').where({ id: levelOne.id }).update({ level_status: 'reviewed', current_progress: 100 })
        await trx('level_nodes').where({ progress_id: levelOne.id }).update({ current_progress: 100 })
        // submissions.completedLevel holds the progress row id, not the level number.
        await trx('submissions').where({ user: student.id }).del()
        await trx('submissions').insert({
            user: student.id,
            completedLevel: levelOne.id,
            question1: 'Mikä oli kirjan mieleenpainuvin hetki?',
            answer1: 'Kohta jossa päähenkilö uskalsi vihdoin lähteä matkaan.',
            question2: 'Kenestä henkilöhahmosta pidit eniten ja miksi?',
            answer2: 'Pidin eniten pikkusiskosta, koska hän ei luovuttanut koskaan.',
            question3: 'Mitä opit tästä kirjasta?',
            answer3: 'Opin että kannattaa pyytää apua, vaikka se tuntuisi vaikealta.'
        })

        await trx('rewards').where({ owner: student.id }).del()
        await trx('rewards').insert([
            ...CONTINENT_GAMES.map((name) => ({ owner: student.id, reward_type: 'minigame', name })),
            ...SCENE_GAMES.map((name) => ({ owner: student.id, reward_type: 'scene-game', name })),
            ...ITEMS.map((name) => ({ owner: student.id, reward_type: 'item', name }))
        ])

        return student.id
    })

    console.log(`Mini-game test player ready (user id ${studentId}).`)
    console.log(`  login page : /login/student`)
    console.log(`  teacher    : ${TEACHER_NAME}`)
    console.log(`  student    : ${STUDENT_NAME}`)
    console.log(`  password   : ${STUDENT_PASSWORD}`)
    console.log(`  unlocked   : ${SCENE_GAMES.length} scene games, ${CONTINENT_GAMES.length} continent puzzles, ${ITEMS.length} items`)
}

try {
    await main()
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
} finally {
    await db.destroy()
}
