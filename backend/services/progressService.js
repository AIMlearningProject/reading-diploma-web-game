import Progress from '../models/progress.js'
import Book from '../models/book.js'
import { NODES_PER_CONTINENT, continentProgress } from '../utils/diplomaConfig.js'

const notFound = (message, userDetails, status = 404) => {
    const err = new Error(message)
    err.userDetails = userDetails
    err.status = status
    return err
}

/**
 * Hang each level's nodes off it. One book per node, so this is what turns a
 * bare percentage into "which books, and how far into each".
 */
const attachNodes = (entries, nodes) => {
    const byProgress = new Map()
    for (const node of nodes) {
        if (!byProgress.has(node.progress_id)) byProgress.set(node.progress_id, [])
        byProgress.get(node.progress_id).push({
            node_index: node.node_index,
            book: node.book,
            book_title: node.book_title,
            current_progress: node.current_progress
        })
    }
    return entries.map((entry) => ({ ...entry, nodes: byProgress.get(entry.id) ?? [] }))
}

const ProgressService = {
    async addNewProgress({ level, user, book }) {
        const existing = await Progress.findSpecificEntry(level, user)
        if (existing) {
            const err = new Error(`This user already has a progress entry for level ${level}`)
            err.status = 400
            throw err
        }

        const created = await Progress.create({
            level,
            user,
            book,
            current_progress: 0,
            level_status: 'incomplete'
        })
        // A continent is a route of nodes, one book each. Without them the
        // continent has nowhere to put a book and will not load in the game.
        await Progress.createNodes(created[0].id, NODES_PER_CONTINENT)
        return created
    },

    async completeLevel(level, { user }) {
        const existing = await Progress.findSpecificEntry(level, user)
        if (!existing) {
            const err = new Error(`Level ${level} was not found for this user`)
            err.status = 404
            throw err
        }
        if (existing.level_status === 'complete') {
            const err = new Error(`Level already completed`)
            err.status = 400
            throw err
        }
        return Progress.completeLevel(level, user)
    },

    async updateCurrentProgress(level, { user, current_progress }) {
        const found = await Progress.findSpecificEntry(level, user)
        if (!found) {
            const err = new Error(`Level: ${level} has no entry for this user`)
            err.userDetails = 'Sinulla ei ole tätä tasoa'
            err.status = 404
            throw err
        }
        return Progress.updateCurrentProgress(level, user, current_progress)
    },

    async changeLevelStatus(level, { user, status, teacherId }) {
        // Check that the teacher is the teacher of the student for this level
        const entry = await Progress.findSpecificEntryByUserAndTeacher(level, user, teacherId)
        if (!entry) {
            const err = new Error(`No progress entry found for this student, level, and teacher combination`)
            err.userDetails = 'Opettaja ei opeta tätä opiskelijaa tai opiskelija ei ole suorittanut tätä tasoa'
            err.status = 400
            throw err
        }
        if (entry.level_status === status) {
            const translate = status === 'complete'
                ? 'suoritettu'
                : status === 'incomplete'
                    ? 'suorittamaton'
                    : 'arvioitu'
            const err = new Error(`Level status is already ${status}.`)
            err.userDetails = `Taso on jo ${translate}`
            err.status = 400
            throw err
        }

        // Result is returned as an array, it's destructurized into an object here
        const [updatedProgress] = await Progress.changeLevelStatus(level, user, status)
        return updatedProgress
    },

    async findByUser(user) {
        const found = await Progress.findByUser(user)
        if (!found) {
            const err = new Error(`No progress entries found for this user`)
            err.status = 404
            throw err
        }
        return found
    },

    async findByUserAndTeacher({ userId, teacherId }) {
        const [found, nodes] = await Promise.all([
            Progress.findByUserAndTeacher(userId, teacherId),
            Progress.findNodesByUserAndTeacher(userId, teacherId)
        ])
        if (!found || found.length === 0) {
            const err = new Error(`No progress entries found for this student, being taught by this teacher`)
            err.userDetails = 'Opettaja ei opeta tätä opiskelijaa tai opiskelija ei ole suorittanut yhtään tasoa'
            err.status = 404
            throw err
        }
        // The teacher marks a whole continent, but they need to see the books
        // behind it: which of the route's stops are read and which are not.
        return attachNodes(found, nodes)
    },

    /**
     * Binds a book to a level. `bookTitle` is the book the pupil says they
     * actually read, which matters for the library's list: a row there is often
     * "X tai jokin muu Y -sarjan kirja", so the catalogue entry alone does not
     * say which book was read. Without one we fall back to the catalogue title.
     */
    async changeBookinEntry(level, user, bookId, bookTitle) {
        const found = await Progress.findSpecificEntry(level, user)
        if (!found) {
            const err = new Error(`Level: ${level} has no entry for this user`)
            err.userDetails = 'Käyttäjällä ei ole merkintää tälle tasolle'
            err.status = 404
            throw err
        }
        const book = await Book.findBookById(bookId)
        if (!book) {
            const err = new Error(`Book with the id ${bookId} was not found. The book might have been deleted.`)
            err.userDetails = 'Kirjaa ei löydetty. Kirja voi olla poistettu.'
            err.status = 404
            throw err
        }
        // progress.book_title is varchar(200) and a catalogue row listing several
        // alternatives can be longer than that.
        const title = (bookTitle?.trim() || book.title).slice(0, 200)
        return Progress.changeBookinEntry(level, user, bookId, title)
    },

    // --- nodes -------------------------------------------------------------

    /**
     * Every level of a user with its nodes attached, which is what the game
     * needs to lay out a continent's route.
     */
    async getEntriesWithNodes(user) {
        const [entries, nodes] = await Promise.all([
            Progress.findByUser(user),
            Progress.findNodesByUser(user)
        ])
        return attachNodes(entries, nodes)
    },

    async _levelOf(level, user) {
        const found = await Progress.findSpecificEntry(level, user)
        if (!found) {
            throw notFound(
                `Level: ${level} has no entry for this user`,
                'Käyttäjällä ei ole merkintää tälle tasolle'
            )
        }
        return found
    },

    /**
     * Recompute the continent's percentage from its nodes and store it.
     * `progress.current_progress` is what drives the token and the quiz, so it
     * must never be written by hand once nodes exist.
     */
    async _syncContinentProgress(level, user, progressId) {
        const nodes = await Progress.findNodesByProgress(progressId)
        const pct = continentProgress(nodes.map((node) => node.current_progress))
        await Progress.updateCurrentProgress(level, user, pct)
        return { pct, nodes }
    },

    /**
     * Bind a book to one node. `bookTitle` is the book the pupil says they read,
     * which the catalogue row alone does not give when it offers a choice.
     */
    async setNodeBook(level, user, nodeIndex, bookId, bookTitle) {
        const entry = await this._levelOf(level, user)
        const node = await Progress.findNode(entry.id, nodeIndex)
        if (!node) {
            throw notFound(
                `Level ${level} has no node ${nodeIndex}`,
                'Tätä etappia ei löytynyt'
            )
        }
        const book = await Book.findBookById(bookId)
        if (!book) {
            throw notFound(
                `Book with the id ${bookId} was not found. The book might have been deleted.`,
                'Kirjaa ei löydetty. Kirja voi olla poistettu.'
            )
        }

        // The same book twice on one continent would let a pupil finish it by
        // reading one book four times.
        const siblings = await Progress.findNodesByProgress(entry.id)
        const clash = siblings.find(
            (other) => other.node_index !== Number(nodeIndex) && other.book === bookId
        )
        if (clash) {
            throw notFound(
                `Book ${bookId} is already on node ${clash.node_index} of level ${level}`,
                'Tämä kirja on jo valittu tälle mantereelle',
                400
            )
        }

        const title = (bookTitle?.trim() || book.title).slice(0, 200)
        const [updated] = await Progress.updateNode(entry.id, nodeIndex, {
            book: bookId,
            book_title: title,
            // A different book means starting over on this node.
            current_progress: node.book === bookId ? node.current_progress : 0
        })
        await Progress.changeBookinEntry(level, user, bookId, title)
        const { pct } = await this._syncContinentProgress(level, user, entry.id)
        return { node: updated, current_progress: pct }
    },

    async setNodeProgress(level, user, nodeIndex, currentProgress) {
        const entry = await this._levelOf(level, user)
        const node = await Progress.findNode(entry.id, nodeIndex)
        if (!node) {
            throw notFound(
                `Level ${level} has no node ${nodeIndex}`,
                'Tätä etappia ei löytynyt'
            )
        }
        if (!node.book) {
            throw notFound(
                `Node ${nodeIndex} of level ${level} has no book yet`,
                'Valitse ensin kirja tälle etapille',
                400
            )
        }
        const [updated] = await Progress.updateNode(entry.id, nodeIndex, {
            current_progress: currentProgress
        })
        const { pct } = await this._syncContinentProgress(level, user, entry.id)
        return { node: updated, current_progress: pct }
    },
}

export default ProgressService