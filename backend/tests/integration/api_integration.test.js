import { test, expect, describe, beforeEach } from 'vitest'
import supertest from 'supertest'
import express from 'express'
import middleware from '../../utils/middleware.js'
import { resetDB } from '../testConfig/cleanTestDB.js'
import { NODES_PER_CONTINENT } from '../../utils/diplomaConfig.js'
import db from '../../db/db.js'

import booksRouter from '../../controllers/books.js'
import rewardsRouter from '../../controllers/rewards.js'
import progressRouter from '../../controllers/progresses.js'
import submissionsRouter from '../../controllers/submissions.js'

// Fixtures, inserted by db/seeds/users_seed.js with fixed ids.
const TEACHER = { id: 1, name: 'John', role: 'teacher', teacher_id: null }
const STUDENT = { id: 2, name: 'Alice', role: 'student', teacher_id: 1 }
const CLASSMATE = { id: 3, name: 'Kalle', role: 'student', teacher_id: 1 }
const OTHER_TEACHER = { id: 5, name: 'Timo', role: 'teacher', teacher_id: null }
const OTHER_STUDENT = { id: 6, name: 'Maija', role: 'student', teacher_id: 5 }

// Who the next request is made by. The routers only ever read `request.user`
// and `request.isAuthenticated()` from passport, so both are faked here rather
// than standing up a real session.
let currentUser = TEACHER
const loginAs = (user) => { currentUser = user }

const app = express()
app.use(express.json())
app.use((request, response, next) => {
    request.user = currentUser
    request.isAuthenticated = () => Boolean(currentUser)
    next()
})
app.use('/api/books', booksRouter)
app.use('/api/rewards', rewardsRouter)
app.use('/api/progress', progressRouter)
app.use('/api/submissions', submissionsRouter)
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

const api = supertest(app)

// Progress rows are normally created alongside the student by
// POST /api/users/students; there is no endpoint that creates them on their own.
// Each level also gets its nodes, one book slot each, the way
// ProgressService.addNewProgress does it.
const giveLevels = async (userId, levelCount = 8) => {
    const rows = []
    for (let level = 1; level <= levelCount; level++) {
        rows.push({ level, user: userId, current_progress: 0, level_status: 'incomplete' })
    }
    const inserted = await db('progress').insert(rows).returning(['id', 'level'])
    const nodes = []
    for (const row of inserted) {
        for (let node_index = 1; node_index <= NODES_PER_CONTINENT; node_index++) {
            nodes.push({ progress_id: row.id, node_index, current_progress: 0 })
        }
    }
    await db('level_nodes').insert(nodes)
    return new Map(inserted.map((row) => [row.level, row.id]))
}

const addBook = async (addedBy, overrides = {}) => {
    const [book] = await db('books')
        .insert({
            title: 'Taikurin hattu',
            author: 'Tove Jansson',
            booktype: 'physical',
            page_count: 180,
            added_by: addedBy,
            ...overrides
        })
        .returning('*')
    return book
}

// The library's catalogue, in miniature. The tests build their own rows rather
// than seeding the real 500-book list: that list belongs to the library and
// changes when they republish it, which is not something a test should break on.
const addDiplomaBook = async (overrides = {}) => {
    const [book] = await db('books')
        .insert({
            source: 'diploma',
            external_key: `key-${Math.random().toString(36).slice(2, 12)}`,
            grade_band: '3-4',
            category: 'Eläinystävämme',
            title: 'Koiramäen lapset',
            author: 'Kunnas, Mauri',
            booktype: 'physical',
            page_count: null,
            added_by: null,
            needs_title_input: false,
            ...overrides
        })
        .returning('*')
    return book
}

const mapCategoryToContinent = async (map_key, grade_band, category) =>
    db('diploma_continents').insert({ map_key, grade_band, category })

const setGrade = async (userId, grade) => db('users').where({ id: userId }).update({ grade })

beforeEach(async () => {
    await resetDB()
    loginAs(TEACHER)
})

describe('Book endpoints', () => {
    test('a teacher can add a book', async () => {
        const response = await api
            .post('/api/books')
            .send({ title: 'Ronja, ryövärintytär', author: 'Astrid Lindgren', booktype: 'physical', page_count: 230 })
            .expect(201)

        const book = response.body
        expect(book.title).toBe('Ronja, ryövärintytär')
        expect(book.added_by).toBe(TEACHER.id)
    })

    test('the same title and author cannot be added twice', async () => {
        const body = { title: 'Taikurin hattu', author: 'Tove Jansson', booktype: 'physical' }

        await api.post('/api/books').send(body).expect(201)
        // The unique index was dropped from the table; bookService still guards it,
        // case-insensitively.
        await api.post('/api/books').send({ ...body, title: 'taikurin HATTU' }).expect(400)
    })

    test('a book title is normalised before it is stored', async () => {
        const response = await api
            .post('/api/books')
            .send({ title: '  Taikurin   hattu  ', author: ' Tove Jansson ', booktype: 'PHYSICAL' })
            .expect(201)

        const book = response.body
        expect(book.title).toBe('Taikurin hattu')
        expect(book.author).toBe('Tove Jansson')
        // booktype is lowercased by the schema before the enum check
        expect(book.booktype).toBe('physical')
    })

    test('an unknown booktype is rejected', async () => {
        await api
            .post('/api/books')
            .send({ title: 'Muumipappa ja meri', author: 'Tove Jansson', booktype: 'papyrus' })
            .expect(400)
    })

    test('a student can add a book too, and it lands in the class list', async () => {
        loginAs(STUDENT)
        await api
            .post('/api/books')
            .send({ title: 'Me Rosvolat', author: 'Siri Kolu', booktype: 'e-book' })
            .expect(201)

        loginAs(TEACHER)
        const response = await api.get('/api/books/my-books').expect(200)
        expect(response.body.map((book) => book.title)).toContain('Me Rosvolat')
    })

    test('my-books excludes books belonging to another teacher', async () => {
        await addBook(TEACHER.id, { title: 'Oma kirja' })
        await addBook(OTHER_TEACHER.id, { title: 'Toisen opettajan kirja' })

        const response = await api.get('/api/books/my-books').expect(200)
        const titles = response.body.map((book) => book.title)
        expect(titles).toContain('Oma kirja')
        expect(titles).not.toContain('Toisen opettajan kirja')
    })

    test('a teacher can delete a book', async () => {
        const book = await addBook(TEACHER.id)

        await api.delete(`/api/books/${book.id}`).expect(204)
        expect(await db('books').where({ id: book.id }).first()).toBeUndefined()
    })

    test('a student cannot delete a book', async () => {
        const book = await addBook(TEACHER.id)
        loginAs(STUDENT)

        await api.delete(`/api/books/${book.id}`).expect(403)
        expect(await db('books').where({ id: book.id }).first()).toBeDefined()
    })

    test('book-readers lists the students currently on that book', async () => {
        const book = await addBook(TEACHER.id)
        const levels = await giveLevels(STUDENT.id)
        await db('progress').where({ id: levels.get(1) }).update({ book: book.id, book_title: book.title })

        const response = await api.get(`/api/books/book-readers/${book.id}`).expect(200)
        expect(response.body).toStrictEqual([{ id: STUDENT.id, name: STUDENT.name }])
    })
})

describe('Diploma catalogue endpoints', () => {
    test('a student gets the list for their own grade band, and only that one', async () => {
        await setGrade(STUDENT.id, 4)
        const mine = await addDiplomaBook({ grade_band: '3-4', title: 'Koiramäen lapset' })
        await addDiplomaBook({ grade_band: '7', title: 'Hobitti eli sinne ja takaisin' })
        loginAs(STUDENT)

        const response = await api.get('/api/books/diploma').expect(200)

        expect(response.body.gradeBand).toBe('3-4')
        expect(response.body.books.map((book) => book.id)).toStrictEqual([mine.id])
    })

    test('grades 1 and 2 share one list', async () => {
        await addDiplomaBook({ grade_band: '1-2', title: 'Kuka lohduttaisi nyytiä?' })

        for (const grade of [1, 2]) {
            await setGrade(STUDENT.id, grade)
            loginAs(STUDENT)
            const response = await api.get('/api/books/diploma').expect(200)
            expect(response.body.gradeBand).toBe('1-2')
            expect(response.body.books).toHaveLength(1)
        }
    })

    test('the catalogue says which continent each group sits on', async () => {
        await setGrade(STUDENT.id, 4)
        await addDiplomaBook({ grade_band: '3-4', category: 'Eläinystävämme' })
        await mapCategoryToContinent('SouthAmericaMap', '3-4', 'Eläinystävämme')
        loginAs(STUDENT)

        const response = await api.get('/api/books/diploma').expect(200)

        expect(response.body.books[0].map_key).toBe('SouthAmericaMap')
        expect(response.body.continents).toStrictEqual([
            { map_key: 'SouthAmericaMap', grade_band: '3-4', category: 'Eläinystävämme' }
        ])
    })

    test('a teacher can look at any grade, a student cannot', async () => {
        await addDiplomaBook({ grade_band: '9', title: 'Seitsemän veljestä' })
        await setGrade(STUDENT.id, 4)

        const asTeacher = await api.get('/api/books/diploma?grade=9').expect(200)
        expect(asTeacher.body.gradeBand).toBe('9')

        loginAs(STUDENT)
        const asStudent = await api.get('/api/books/diploma?grade=9').expect(200)
        expect(asStudent.body.gradeBand).toBe('3-4')
    })

    test('the diploma catalogue stays out of the class book list', async () => {
        await addBook(TEACHER.id, { title: 'Taikurin hattu' })
        await addDiplomaBook({ title: 'Koiramäen lapset' })

        const response = await api.get('/api/books/my-books').expect(200)

        expect(response.body.map((book) => book.title)).toStrictEqual(['Taikurin hattu'])
    })

    test('a teacher cannot delete a book from the library catalogue', async () => {
        const book = await addDiplomaBook()

        await api.delete(`/api/books/${book.id}`).expect(403)

        expect(await db('books').where({ id: book.id }).first()).toBeDefined()
    })

    test('a class can still add a book that is already in the catalogue', async () => {
        await addDiplomaBook({ title: 'Koiramäen lapset', author: 'Kunnas, Mauri' })

        const response = await api
            .post('/api/books')
            .send({ title: 'Koiramäen lapset', author: 'Kunnas, Mauri' })
            .expect(201)

        expect(response.body.source).toBe('custom')
        expect(response.body.added_by).toBe(TEACHER.id)
    })

    test('a book in another class does not block this one', async () => {
        await addBook(OTHER_TEACHER.id, { title: 'Taikurin hattu' })

        await api.post('/api/books').send({ title: 'Taikurin hattu', author: 'Tove Jansson' }).expect(201)
    })
})

describe('Continent route (nodes)', () => {
    test('every level comes back with its nodes', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        const response = await api.get('/api/progress').expect(200)

        expect(response.body).toHaveLength(8)
        for (const entry of response.body) {
            expect(entry.nodes).toHaveLength(NODES_PER_CONTINENT)
            expect(entry.nodes.map((node) => node.node_index))
                .toStrictEqual([1, 2, 3, 4].slice(0, NODES_PER_CONTINENT))
        }
    })

    test('a book is bound to one node, not to the whole continent', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook({ title: 'Koiramäen lapset' })
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/2/book').send({ book: book.id }).expect(200)

        const nodes = await api.get('/api/progress').expect(200)
            .then((response) => response.body.find((entry) => entry.level === 1).nodes)
        expect(nodes.find((node) => node.node_index === 2).book).toBe(book.id)
        expect(nodes.find((node) => node.node_index === 1).book).toBeNull()
    })

    test('the same book cannot sit on two nodes of one continent', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook()
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/1/book').send({ book: book.id }).expect(200)
        await api.put('/api/progress/1/nodes/2/book').send({ book: book.id }).expect(400)

        // ...but the same book on another continent is fine.
        await api.put('/api/progress/2/nodes/1/book').send({ book: book.id }).expect(200)
    })

    test('the continent percentage is the average of its nodes', async () => {
        await giveLevels(STUDENT.id)
        const books = await Promise.all([
            addDiplomaBook({ title: 'Yksi' }),
            addDiplomaBook({ title: 'Kaksi' })
        ])
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/1/book').send({ book: books[0].id }).expect(200)
        await api.put('/api/progress/1/nodes/2/book').send({ book: books[1].id }).expect(200)
        await api.put('/api/progress/1/nodes/1/current-progress').send({ current_progress: 100 }).expect(200)
        const response = await api.put('/api/progress/1/nodes/2/current-progress')
            .send({ current_progress: 50 }).expect(200)

        // 100 + 50 + 0 + 0 over four nodes.
        expect(response.body.current_progress).toBe(38)
        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.current_progress).toBe(38)
    })

    test('a node needs a book before it can have progress', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/1/current-progress')
            .send({ current_progress: 40 }).expect(400)
    })

    test('the pupil records which book they read on a node', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook({
            title: 'Tarina vailla loppua tai Momo',
            needs_title_input: true
        })
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/3/book')
            .send({ book: book.id, book_title: 'Momo' }).expect(200)

        const nodes = await api.get('/api/progress').expect(200)
            .then((response) => response.body.find((entry) => entry.level === 1).nodes)
        expect(nodes.find((node) => node.node_index === 3).book_title).toBe('Momo')
    })

    test('changing a node’s book starts that node over', async () => {
        await giveLevels(STUDENT.id)
        const [first, second] = await Promise.all([addDiplomaBook({ title: 'A' }), addDiplomaBook({ title: 'B' })])
        loginAs(STUDENT)

        await api.put('/api/progress/1/nodes/1/book').send({ book: first.id }).expect(200)
        await api.put('/api/progress/1/nodes/1/current-progress').send({ current_progress: 80 }).expect(200)
        const response = await api.put('/api/progress/1/nodes/1/book').send({ book: second.id }).expect(200)

        expect(response.body.node.current_progress).toBe(0)
    })

    test('a node on a level the pupil does not have is a 404', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook()
        loginAs(STUDENT)

        await api.put('/api/progress/9/nodes/1/book').send({ book: book.id }).expect(404)
        await api.put('/api/progress/1/nodes/99/book').send({ book: book.id }).expect(404)
    })
})

describe('Teacher reviewing a pupil', () => {
    test('the teacher sees every level of their pupil, with its route', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook({ title: 'Koirami\u00e4en lapset' })
        loginAs(STUDENT)
        await api.put('/api/progress/1/nodes/2/book').send({ book: book.id }).expect(200)
        await api.put('/api/progress/1/nodes/2/current-progress').send({ current_progress: 100 }).expect(200)
        loginAs(TEACHER)

        const response = await api.get(`/api/progress/student/${STUDENT.id}`).expect(200)

        expect(response.body).toHaveLength(8)
        const level1 = response.body.find((entry) => entry.level === 1)
        expect(level1.nodes).toHaveLength(NODES_PER_CONTINENT)
        expect(level1.nodes.find((node) => node.node_index === 2)).toMatchObject({
            book: book.id,
            current_progress: 100
        })
        // A level the pupil has not started still comes back with empty stops,
        // so the teacher can see there is nothing there rather than nothing at all.
        const level5 = response.body.find((entry) => entry.level === 5)
        expect(level5.nodes).toHaveLength(NODES_PER_CONTINENT)
        expect(level5.nodes.every((node) => node.book === null)).toBe(true)
    })

    test('a teacher cannot see the route of a pupil who is not theirs', async () => {
        await giveLevels(OTHER_STUDENT.id)
        loginAs(TEACHER)

        await api.get(`/api/progress/student/${OTHER_STUDENT.id}`).expect(404)
    })
})

describe('Progress endpoints', () => {
    test('a student sees their own entries', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        const response = await api.get('/api/progress').expect(200)
        expect(response.body).toHaveLength(8)
        expect(response.body.every((entry) => entry.level_status === 'incomplete')).toBe(true)
        expect(response.body.map((entry) => entry.level).sort((a, b) => a - b))
            .toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })

    test('binding a book to a level also stores its title', async () => {
        await giveLevels(STUDENT.id)
        const book = await addBook(TEACHER.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/add-book').send({ book: book.id }).expect(200)

        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.book).toBe(book.id)
        expect(entry.book_title).toBe(book.title)
    })

    test('the pupil records which book they actually read', async () => {
        await giveLevels(STUDENT.id)
        // A catalogue row that offers a choice rather than naming one book.
        const book = await addDiplomaBook({
            title: 'Tarina vailla loppua tai Momo',
            needs_title_input: true
        })
        loginAs(STUDENT)

        await api.put('/api/progress/1/add-book')
            .send({ book: book.id, book_title: 'Momo' })
            .expect(200)

        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.book).toBe(book.id)
        expect(entry.book_title).toBe('Momo')
    })

    test('a catalogue title longer than the column is cut, not rejected', async () => {
        await giveLevels(STUDENT.id)
        const book = await addDiplomaBook({ title: 'Urpo ja Turpo '.repeat(18).trim() })
        loginAs(STUDENT)

        await api.put('/api/progress/1/add-book').send({ book: book.id }).expect(200)

        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.book_title).toHaveLength(200)
    })

    test('binding a book that does not exist fails', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/add-book').send({ book: 9999 }).expect(404)
    })

    test('current progress can be updated but not past 100', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/current-progress').send({ current_progress: 45 }).expect(200)
        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.current_progress).toBe(45)

        await api.put('/api/progress/1/current-progress').send({ current_progress: 101 }).expect(400)
    })

    test('updating a level the user does not have fails', async () => {
        loginAs(STUDENT)
        await api.put('/api/progress/1/current-progress').send({ current_progress: 10 }).expect(404)
    })

    test('a level can be completed once', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/completed').send({ user: STUDENT.id }).expect(200)
        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.level_status).toBe('complete')

        await api.put('/api/progress/1/completed').send({ user: STUDENT.id }).expect(400)
    })

    test('a teacher can mark their own student\'s level as reviewed', async () => {
        await giveLevels(STUDENT.id)

        await api.put('/api/progress/1/status').send({ user: STUDENT.id, status: 'reviewed' }).expect(200)
        const entry = await db('progress').where({ user: STUDENT.id, level: 1 }).first()
        expect(entry.level_status).toBe('reviewed')
    })

    test('a teacher cannot change the status of another teacher\'s student', async () => {
        await giveLevels(OTHER_STUDENT.id)

        await api.put('/api/progress/1/status').send({ user: OTHER_STUDENT.id, status: 'reviewed' }).expect(400)
    })

    test('a student cannot change a level status', async () => {
        await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api.put('/api/progress/1/status').send({ user: STUDENT.id, status: 'reviewed' }).expect(403)
    })

    test('an unknown status is rejected', async () => {
        await giveLevels(STUDENT.id)

        await api.put('/api/progress/1/status').send({ user: STUDENT.id, status: 'brilliant' }).expect(400)
    })

    test('a teacher reads the entries of their own student', async () => {
        await giveLevels(STUDENT.id)

        const response = await api.get(`/api/progress/student/${STUDENT.id}`).expect(200)
        expect(response.body).toHaveLength(8)
        expect(response.body.every((entry) => entry.user === STUDENT.id)).toBe(true)
    })

    test('a teacher cannot read the entries of another teacher\'s student', async () => {
        await giveLevels(OTHER_STUDENT.id)

        await api.get(`/api/progress/student/${OTHER_STUDENT.id}`).expect(404)
    })
})

describe('Submission endpoints', () => {
    const answers = {
        question1: 'Mikä oli kirjan mieleenpainuvin hetki?',
        answer1: 'Kohta jossa päähenkilö lähti matkaan.',
        question2: 'Kenestä henkilöhahmosta pidit eniten?',
        answer2: 'Pikkusiskosta, koska hän ei luovuttanut.',
        question3: 'Mitä opit tästä kirjasta?',
        answer3: 'Että kannattaa pyytää apua.'
    }

    test('a student submits the answers for a level', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        // completedLevel is the PROGRESS ROW ID, not the level number.
        await api
            .post('/api/submissions/add-submission')
            .send({ ...answers, completedLevel: levels.get(1) })
            .expect(201)

        const stored = await db('submissions').where({ user: STUDENT.id }).first()
        expect(stored.completedLevel).toBe(levels.get(1))
        expect(stored.answer1).toBe(answers.answer1)
    })

    test('the same level cannot be submitted twice', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)
        const body = { ...answers, completedLevel: levels.get(1) }

        await api.post('/api/submissions/add-submission').send(body).expect(201)
        await api.post('/api/submissions/add-submission').send(body).expect(400)
    })

    test('an answer shorter than three characters is rejected', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api
            .post('/api/submissions/add-submission')
            .send({ ...answers, answer1: 'ei', completedLevel: levels.get(1) })
            .expect(400)
    })

    test('a student reads back their own submissions', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)
        await api
            .post('/api/submissions/add-submission')
            .send({ ...answers, completedLevel: levels.get(2) })
            .expect(201)

        const response = await api.get('/api/submissions').expect(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].completedLevel).toBe(levels.get(2))
    })

    test('a resubmission overwrites the previous answers', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)
        await api
            .post('/api/submissions/add-submission')
            .send({ ...answers, completedLevel: levels.get(1) })
            .expect(201)

        await api
            .put('/api/submissions')
            .send({ ...answers, answer1: 'Toinen yritys tähän kysymykseen.', completedLevel: levels.get(1) })
            .expect(200)

        const stored = await db('submissions').where({ user: STUDENT.id }).first()
        expect(stored.answer1).toBe('Toinen yritys tähän kysymykseen.')
        expect(await db('submissions').where({ user: STUDENT.id })).toHaveLength(1)
    })

    test('resubmitting a level that was never submitted fails', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)

        await api
            .put('/api/submissions')
            .send({ ...answers, completedLevel: levels.get(1) })
            .expect(404)
    })

    test('a teacher reads their own student\'s submissions', async () => {
        const levels = await giveLevels(STUDENT.id)
        loginAs(STUDENT)
        await api
            .post('/api/submissions/add-submission')
            .send({ ...answers, completedLevel: levels.get(1) })
            .expect(201)

        loginAs(TEACHER)
        const response = await api.get(`/api/submissions/student/${STUDENT.id}`).expect(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].user).toBe(STUDENT.id)
    })

    test('a teacher gets nothing for a student who has not answered', async () => {
        await giveLevels(CLASSMATE.id)

        await api.get(`/api/submissions/student/${CLASSMATE.id}`).expect(404)
    })
})

describe('Reward endpoints', () => {
    test('a reward can be added and read back', async () => {
        loginAs(STUDENT)

        await api
            .post('/api/rewards/add-reward')
            .send({ owner: STUDENT.id, reward_type: 'minigame', name: 'ArcticMap' })
            .expect(201)

        const response = await api.get('/api/rewards').expect(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].reward_type).toBe('minigame')
        expect(response.body[0].name).toBe('ArcticMap')
    })

    test('the same reward cannot be granted twice', async () => {
        loginAs(STUDENT)
        const body = { owner: STUDENT.id, reward_type: 'minigame', name: 'ArcticMap' }

        await api.post('/api/rewards/add-reward').send(body).expect(201)
        await api.post('/api/rewards/add-reward').send(body).expect(400)
    })

    test('a malformed reward is rejected', async () => {
        loginAs(STUDENT)

        await api
            .post('/api/rewards/add-reward')
            .send({ owner: STUDENT.id, reward_type: 'minigame' })
            .expect(400)
    })

    test('rewards are scoped to their owner', async () => {
        loginAs(STUDENT)
        await api
            .post('/api/rewards/add-reward')
            .send({ owner: STUDENT.id, reward_type: 'minigame', name: 'ArcticMap' })
            .expect(201)

        loginAs(CLASSMATE)
        const response = await api.get('/api/rewards').expect(200)
        expect(response.body).toStrictEqual([])
    })
})
