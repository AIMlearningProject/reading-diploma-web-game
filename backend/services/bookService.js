import Book from '../models/book.js'
import User from '../models/user.js'
import { gradeBandFor } from '../utils/gradeBand.js'

// Every id whose books make up one class's shared list: the teacher and all of
// their students.
const classMemberIds = async (teacherId) => {
    const ids = (await User.findStudentsByTeacher(teacherId)).map((student) => student.id)
    ids.push(teacherId)
    return ids
}

const BookService = {
    async addBook({ title, author, booktype, page_count, added_by, teacherId }) {
        const classIds = await classMemberIds(teacherId ?? added_by)
        const existing = await Book.findByTitleAndAuthor(title, author, classIds)
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
            booktype,
            page_count,
            added_by
        })
        return newBook
    },

    async getBooksByTeacher(teacherId) {
        const addedByIds = await classMemberIds(teacherId)
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
        if (book.source === 'diploma') {
            const err = new Error('Diploma catalogue books are not owned by a teacher')
            err.userDetails = 'Lukudiplomin kirjalistan kirjoja ei voi poistaa'
            err.status = 403
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
    },

    async getBookReaders(bookId) {
        return await Book.findCurrentBookReaders(bookId)
    },

    /**
     * The library's book list for one user, plus which group sits on which
     * continent. A pupil gets their own grade's list; a teacher gets the list
     * of whichever grade they ask for, so they can see what their class sees.
     *
     * The pupil's grade is read from the database rather than from the session:
     * a teacher can change it, and the session copy would stay stale until the
     * pupil logged in again.
     */
    async getDiplomaCatalogue({ userId, grade }) {
        if (grade === undefined) {
            const user = await User.findUserById(userId)
            grade = user?.grade
        }
        const gradeBand = gradeBandFor(grade)
        if (!gradeBand) {
            const err = new Error(`No diploma book list exists for grade '${grade}'`)
            err.userDetails = 'Tälle luokka-asteelle ei löydy lukudiplomin kirjalistaa'
            err.status = 400
            throw err
        }
        const [books, continents] = await Promise.all([
            Book.getDiplomaByGrade(gradeBand),
            Book.getDiplomaContinents(gradeBand)
        ])
        return { gradeBand, books, continents }
    },
}

export default BookService