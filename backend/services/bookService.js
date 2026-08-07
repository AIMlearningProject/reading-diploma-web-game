import Book from '../models/book.js'
import User from '../models/user.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import logger from '../utils/logger.js'

const BookService = {
    async addBook({ title, author, coverimage, booktype, page_count, added_by }) {
        const existing = await Book.findByTitleAndAuthor(title, author)
        if (existing) {
            const err = new Error(`A book with the title and author '${title}' - '${author}' already exists`)
            err.userDetails = `Kirjoittajan: '${author}' kirjoittama kirja: '${title}' on jo lisätty`
            err.status = 400
            throw err
        }

        const addedBooks = await Book.getByAdder(added_by)
        const bookLimit = process.env.NODE_ENV === 'production' ? 20 : 40

        if (addedBooks.length >= bookLimit) {
            const err = new Error(`One user can add a maximum of ${bookLimit} books`)
            err.userDetails = `Voit lisätä enintään ${bookLimit} kirjaa`
            err.status = 403
            throw err
        }

        const [newBook] = await Book.create({
            title,
            author,
            coverimage,
            booktype,
            page_count,
            added_by
        })
        return newBook
    },

    async getBooksByTeacher(teacherId) {
        const addedByIds = (await User.findStudentsByTeacher(teacherId)).map((student) => student.id)
        addedByIds.push(teacherId)
        const books = await Book.getByTeacher(addedByIds)
        if (!books) {
            const err = new Error(`No books were found`)
            err.userDetails = 'Sinä tai oppilaasi ette ole vielä lisänneet kirjoja'
            err.status = 404
            throw err
        }
        return books
    },

    async deleteBook(teacherId, id) {
        const book = await Book.findBookById(id)
        if (!book) {
            const err = new Error(`Book not found`)
            err.userDetails = 'Kirjaa ei löytynyt'
            err.status = 404
            throw err
        }
        const studentIds = (await User.findStudentsByTeacher(teacherId)).map((student) => student.id)

        if (book.added_by !== teacherId && !studentIds.includes(book.added_by)) {
            const err = new Error('Forbidden')
            err.userDetails = 'Sinulla ei ole oikeutta poistaa tätä kirjaa'
            err.status = 403
            throw err
        }

        const deletedRows = await Book.deleteBook(id)
        if (!deletedRows) {
            const err = new Error('Book delete failed')
            err.userDetails = 'Kirjan poistaminen epäonnistui'
            err.status = 500
            throw err
        }

        // Remove cover image from disk if it's not the default placeholder
        try {
            const cover = book.coverimage
            if (cover && !cover.endsWith('defaultNoImg.ico')) {
                const __filename = fileURLToPath(import.meta.url)
                const __dirname = path.dirname(__filename)
                const relative = cover.startsWith('/') ? cover.slice(1) : cover
                const filepath = path.resolve(__dirname, '..', 'public', relative)
                await fs.unlink(filepath)
            }
        } catch (err) {
            // Log the error but do not fail the request because the DB delete already happened
            logger.error('Failed to delete book cover file:', err)
        }

        return deletedRows
    },

    async getBookReaders(bookId) {
        return await Book.findCurrentBookReaders(bookId)
    },
}

export default BookService