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

    async findSpecificEntry(level, user, dbConn = db) {
        level = Number(level)
        user = Number(user)
        return dbConn('progress')
            .select('level', 'user', 'book', 'current_progress', 'level_status')
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