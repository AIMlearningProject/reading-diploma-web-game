import db from '../db/db.js'

const Book = {
    async create({ title, author, coverimage, booktype, content, added_by }, dbConn = db) {
        return dbConn('books')
            .insert({ title, author, coverimage, booktype, content, added_by })
            .returning('*')
    },

    async findByTitleAndAuthor(title, author, dbConn = db) {
        return dbConn('books')
            .select('title', 'author', 'coverimage', 'booktype', 'content')
            .whereRaw('LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?)', [title, author]) // Used raw SQL here since knex doesn't have support for functional unique indexes
            .first()
    },

    async getByAdder(added_by, dbConn = db) {
        return dbConn('books')
            .select('*')
            .where({ added_by })
    },

    async getByTeacher(addedByIds, dbConn = db) {
        return dbConn('books')
            .select('id', 'title', 'author', 'coverimage', 'booktype', 'content')
            .whereIn('added_by', addedByIds)
    },

    async deleteBook(id, dbConn = db) {
        return dbConn('books')
            .where({ id })
            .del()
    },

    async findBookById(id, dbConn = db) {
        return dbConn('books')
            .select('*')
            .where({ id })
            .first()
    },

    async findCurrentBookReaders(bookId, dbConn = db) {
        return dbConn('users')
            .select('users.id', 'users.name')
            .join('progress', 'progress.user', 'users.id')
            .where('progress.book', bookId)
            .whereIn('progress.level_status', ['incomplete', 'Resubmit'])
    },

    // Unused (used only in unused services)
    async findBookReaders(bookId, dbConn = db) {
        return dbConn('users')
            .select('users.id', 'users.name')
            .join('progress', 'progress.user', 'users.id')
            .where('progress.book', bookId)
    },

    // Unused (used only in unused services)
    async getAll(dbConn = db) {
        return dbConn('books')
            .select('*')
    },
}

export default Book