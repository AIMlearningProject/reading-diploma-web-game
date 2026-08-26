import BookService from '../services/bookService.js'
import express from 'express'
import { z } from 'zod'
import middleware from '../utils/middleware.js'

const booksRouter = express.Router()

// Gets all the students that are currently reading a book
booksRouter.get('/book-readers/:id', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const bookId = request.params.id
        const readers = await BookService.getBookReaders(bookId)
        response.status(200).json(readers)
    } catch (error) {
        next(error)
    }
})

// Gets all the books added by the user's "class" (teacher + students)
booksRouter.get('/my-books', middleware.requireAuthentication(true), async (request, response, next) => {
    try {
        const teacherId = request.user.role === 'teacher' ? request.user.id : request.user.teacher_id
        const books = await BookService.getBooksByTeacher(teacherId)
        response.status(200).json(books)
    } catch (error) {
        next(error)
    }
})

const booktypes = z.enum(['physical', 'e-book', 'audio'])
const bookSchema = z.object({
    title: z.string(),
    author: z.string(),
    booktype: z.string().transform(str => str.toLowerCase()).pipe(booktypes).optional(),
    page_count: z.coerce.number().int().min(1).optional()
}).strict()

booksRouter.post('/',
    middleware.requireAuthentication(true),
    middleware.zValidate(bookSchema),
    async (request, response, next) => {
        const normalize = (string) => {
            return string
                .normalize('NFKC') // Normalize Unicode characters to a standard form
                .replace(/\u00AD/g, '') // Remove soft hyphens
                .replace(/\u200B/g, '') // remove zero‑width spaces
                .replace(/[^\S\r\n]+/g, ' ') // Replace all whitespace (except newlines) with a single space
                .trim()
        }

        const { title: rawTitle, author: rawAuthor, booktype, page_count } = request.validated

        try {
            const bookToCreate = {
                title: normalize(rawTitle),
                author: normalize(rawAuthor),
                booktype,
                page_count,
                added_by: request.user.id
            }

            const createdBook = await BookService.addBook(bookToCreate)
            response.status(201).json(createdBook)
        } catch (error) {
            next(error)
        }
    }
)

booksRouter.delete('/:id', middleware.requireTeacherRole, async (request, response, next) => {
    const bookId = request.params.id
    const teacherId = request.user.id
    try {
        await BookService.deleteBook(teacherId, bookId)
        return response.status(204).end()
    } catch (error) {
        next(error)
    }
})

export default booksRouter