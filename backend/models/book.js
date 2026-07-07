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

    async getAll(dbConn = db) {
        return dbConn('books')
            .select('id', 'title', 'author', 'coverimage', 'booktype', 'content'/*, 'added_by'*/)
            //.select('*')
    },

    async getByAdder(added_by, dbConn = db) {
        return dbConn('books')
            .select('id', 'title', 'author', 'coverimage', 'booktype', 'content'/*, 'added_by'*/)
            .where({ added_by })
            //.select('*')
    },

    async deleteBook(id, dbConn = db){
        return dbConn('books')
            .where({ id })
            .del()
    },

    // Unused (used only in unused services)
    async findBookById(id, dbConn = db){
        return dbConn('books')
            .select('title', 'author', 'coverimage', 'booktype', 'content')
            .where({ id })
            .first()
    },
}

export default Book