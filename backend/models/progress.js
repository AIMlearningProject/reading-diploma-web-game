import db from '../db/db.js'

const Progress = {
    async create({ level, user, book, current_progress, level_status }, dbConn = db) {
        return dbConn('progress')
            .insert({ level, user, book, current_progress, level_status })
            .returning('*')
    },

    async findByUser(user, dbConn = db) {
        return dbConn('progress')
            .select('id', 'level', 'user', 'book', 'current_progress', 'level_status', 'book_title')
            .where({ user: user })
    },

    // --- nodes: one per book slot on a continent --------------------------

    async createNodes(progressId, nodeCount, dbConn = db) {
        const rows = []
        for (let node_index = 1; node_index <= nodeCount; node_index++) {
            rows.push({ progress_id: progressId, node_index, current_progress: 0 })
        }
        return dbConn('level_nodes').insert(rows).returning('*')
    },

    async findNodesByUser(user, dbConn = db) {
        return dbConn('level_nodes')
            .select(
                'level_nodes.id', 'level_nodes.progress_id', 'level_nodes.node_index',
                'level_nodes.book', 'level_nodes.book_title', 'level_nodes.current_progress',
                'progress.level'
            )
            .innerJoin('progress', 'progress.id', 'level_nodes.progress_id')
            .where('progress.user', user)
            .orderBy(['progress.level', 'level_nodes.node_index'])
    },

    // Same scoping as findByUserAndTeacher: a teacher only ever sees the route
    // of a pupil who is actually theirs.
    async findNodesByUserAndTeacher(userId, teacherId, dbConn = db) {
        return dbConn('level_nodes')
            .select(
                'level_nodes.progress_id', 'level_nodes.node_index', 'level_nodes.book',
                'level_nodes.book_title', 'level_nodes.current_progress', 'progress.level'
            )
            .innerJoin('progress', 'progress.id', 'level_nodes.progress_id')
            .innerJoin('users', 'users.id', 'progress.user')
            .where('progress.user', Number(userId))
            .andWhere('users.teacher_id', Number(teacherId))
            .andWhere('users.role', 'student')
            .orderBy(['progress.level', 'level_nodes.node_index'])
    },

    async findNodesByProgress(progressId, dbConn = db) {
        return dbConn('level_nodes')
            .select('id', 'node_index', 'book', 'book_title', 'current_progress')
            .where({ progress_id: progressId })
            .orderBy('node_index')
    },

    async findNode(progressId, nodeIndex, dbConn = db) {
        return dbConn('level_nodes')
            .where({ progress_id: progressId, node_index: Number(nodeIndex) })
            .first()
    },

    async updateNode(progressId, nodeIndex, updates, dbConn = db) {
        return dbConn('level_nodes')
            .where({ progress_id: progressId, node_index: Number(nodeIndex) })
            .update(updates)
            .returning('*')
    },

    async findSpecificEntry(level, user, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            // `id` is what level_nodes hangs off, so it is always selected here.
            .select('id', 'level', 'user', 'book', 'current_progress', 'level_status')
            .where({ level, user })
            .first()
    },

    async findSpecificEntryByUserAndTeacher(level, userId, teacherId, dbConn = db) {
        level = Number(level)
        userId = Number(userId)
        teacherId = Number(teacherId)
        return dbConn('progress')
            .select('progress.id', 'level', 'user', 'book', 'current_progress', 'level_status')
            .innerJoin('users', 'users.id', 'progress.user')
            .where('progress.level', level)
            .andWhere('progress.user', userId)
            .andWhere('users.teacher_id', teacherId)
            .andWhere('users.role', 'student')
            .first()
    },

    async completeLevel(level, user, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            .where({ level, user })
            .update({ level_status: 'complete' })
            .returning('*')
    },

    async updateCurrentProgress(level, user, current_progress, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            .where({ level, user })
            .update({ current_progress: current_progress })
            .returning('*')
    },

    async changeLevelStatus(level, user, status, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            .where({ level, user })
            .update({ level_status: status })
            .returning('*')
    },

    // Kept in step with the node the pupil touched last, so book-readers and
    // the teacher's level list still show a book without being rewritten.
    async changeBookinEntry(level, user, bookId, bookTitle, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            .where({ level, user })
            .update({ book: bookId, book_title: bookTitle })
            .returning('*')
    },

    async findByUserAndTeacher(userId, teacherId, dbConn = db) {
        userId = Number(userId)
        teacherId = Number(teacherId)
        return dbConn('progress')
            .select('progress.id', 'level', 'user', 'book', 'current_progress', 'level_status', 'book_title')
            .innerJoin('users', 'users.id', 'progress.user')
            .where('progress.user', userId)
            .andWhere('users.teacher_id', teacherId)
            .andWhere('users.role', 'student')
    },
}

export default Progress