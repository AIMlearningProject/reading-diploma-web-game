import db from '../db/db.js'

const Book = {
    async create({ title, author, coverimage, booktype, page_count, added_by }, dbConn = db) {
        return dbConn('books')
            .insert({ title, author, coverimage, booktype, page_count, added_by })
            .returning('*')
    },

    async findByTitleAndAuthor(title, author, dbConn = db) {
        return dbConn('books')
            .select('title', 'author', 'coverimage', 'booktype', 'page_count')
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
            .select('id', 'title', 'author', 'coverimage', 'booktype', 'page_count')
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
}

export default Book