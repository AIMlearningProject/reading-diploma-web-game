import db from '../db/db.js'

const Book = {
    async create({ title, author, booktype, page_count, added_by }, dbConn = db) {
        return dbConn('books')
            .insert({ title, author, booktype, page_count, added_by })
            .returning('*')
    },

    // Scoped to the class's own books on purpose: a pupil must still be able to
    // add a book that happens to appear in the library's diploma catalogue, and
    // one class's books say nothing about another's.
    async findByTitleAndAuthor(title, author, addedByIds, dbConn = db) {
        return dbConn('books')
            .select('title', 'author', 'booktype', 'page_count')
            .where({ source: 'custom' })
            .whereIn('added_by', addedByIds)
            .whereRaw('LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?)', [title, author]) // Used raw SQL here since knex doesn't have support for functional unique indexes
            .first()
    },

    async getByAdder(added_by, dbConn = db) {
        return dbConn('books')
            .select('*')
            .where({ added_by, source: 'custom' })
    },

    async getByTeacher(addedByIds, dbConn = db) {
        return dbConn('books')
            .select('id', 'title', 'author', 'booktype', 'page_count')
            .where({ source: 'custom' })
            .whereIn('added_by', addedByIds)
    },

    // The library's catalogue for one grade band. Owner-less, shared by every
    // school, and never returned by /my-books, which stays the class's own list.
    async getDiplomaByGrade(gradeBand, dbConn = db) {
        return dbConn('books')
            .select(
                'books.id', 'books.title', 'books.author', 'books.booktype',
                'books.page_count', 'books.grade_band', 'books.category',
                'books.alt_titles', 'books.series_note', 'books.needs_title_input',
                'diploma_continents.map_key'
            )
            .leftJoin('diploma_continents', function () {
                this.on('diploma_continents.category', '=', 'books.category')
                    .andOn('diploma_continents.grade_band', '=', 'books.grade_band')
            })
            .where({ 'books.source': 'diploma', 'books.grade_band': gradeBand })
            .orderBy(['books.category', 'books.author', 'books.title'])
    },

    // Which group of a grade's list sits on which continent. A continent with no
    // row here offers the whole list instead.
    async getDiplomaContinents(gradeBand, dbConn = db) {
        return dbConn('diploma_continents')
            .select('map_key', 'grade_band', 'category')
            .where({ grade_band: gradeBand })
            .orderBy(['map_key', 'category'])
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