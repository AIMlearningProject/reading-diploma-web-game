import Book from '../models/book.js'

const BookService = {
    async addBook({ title, author, coverimage, booktype, content, added_by }) {
        const existing = await Book.findByTitleAndAuthor(title, author)
        if (existing) {
            const err = new Error(`A book with the title and author '${title}' - '${author}' already exists`)
            err.userDetails = `Kirjoittajan: '${author}' kirjoittama kirja: '${title}' on jo lisätty`
            err.status = 400
            throw err
        }

        const addedBooks = await Book.getByAdder(added_by)
        if (addedBooks.length >= 30) {
            const err = new Error(`One user can add a maximum of ${addedBooks.length} books`)
            err.userDetails = `Voit lisätä enintään ${addedBooks.length} kirjaa`
            err.status = 403
            throw err
        }

        return Book.create({
            title,
            author,
            coverimage,
            booktype,
            content,
            added_by
        })
    },

    async getAllBooks() {
        const books = await Book.getAll()
        if (!books) {
            const err = new Error(`No books were found`)
            err.userDetails = 'Kirjoja ei vielä lisätty'
            err.status = 404
            throw err
        }
        return books
    },

    // Unused (used only in unused endpoint)
    async findBookById(id) {
        const book = await Book.findBookById(id)
        if (!book) {
            const err = new Error(`Book not found`)
            err.userDetails = 'Kirjaa ei löytynyt'
            err.status = 404
            throw err
        }
        return book
    },

    // Unused (used only in unused endpoint)
    async deleteBook(id) {
        const book = await Book.findBookById(id)
        if (!book) {
            const err = new Error(`Book not found`)
            err.userDetails = 'Kirjaa ei löytynyt'
            err.status = 404
            throw err
        }
        await Book.deleteBook(id)
    }
}

export default BookService