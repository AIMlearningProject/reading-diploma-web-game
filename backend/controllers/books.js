import BookService from '../services/bookService.js'
import express from 'express'
import { z } from 'zod'
import multer from 'multer'
import middleware from '../utils/middleware.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'

const booksRouter = express.Router()

const booktypes = z.enum(['physical', 'e-book', 'audio'])
const bookSchema = z.object({
    title: z.string(),
    author: z.string(),
    booktype: z.string().transform(str => str.toLowerCase()).pipe(booktypes).optional(),
    content: z.string().optional()
}).strict()
// Note: file uploads are handled by multer (upload.single('coverimage')).
// We do NOT validate the file with zod here because multer parses multipart
// bodies and places the file on `request.file`.

// ∨∨∨ For uploading cover images
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jfif', 'image/webp']
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!allowedImageTypes.includes(file.mimetype)) {
            const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)
            err.message = 'Vain kuvatiedostot ovat sallittuja (jpg, png, jfif, webp).'
            err.name = 'MulterError'
            return cb(err, false)
        }
        cb(null, true)
    }
})

booksRouter.get('/', middleware.requireAuthentication(true), async (request, response, next) => {
    try {
        const books = await BookService.getAllBooks()
        response.json(books)
    } catch (error) {
        next(error)
    }
})

booksRouter.get('/:id', middleware.requireAuthentication(true), async (request, response, next) => {
    const { id } = request.params
    try {
        const book = await BookService.findBookById(id)
        response.json(book)
    } catch (error) {
        next(error)
    }
})

booksRouter.post('/',
    middleware.requireAuthentication(true),
    upload.single('coverimage'),
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

        const { title: rawTitle, author: rawAuthor, booktype, content } = request.validated

        if (!request.file) {
            return response.status(400).json({ error: 'No cover image uploaded' })
        }

        try {
            // Generate a safe filename
            const safeName = request.file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')
            const filename = `${Date.now()}-${safeName}`

            const newBook = {
                title: normalize(rawTitle),
                author: normalize(rawAuthor),
                coverimage: `/uploads/book-covers/${filename}`,
                booktype,
                content
            }

            await BookService.addBook(newBook)

            // Write file to disk only after all validations have passed
            const coverUploadDir = path.resolve(__dirname, '../public/uploads/book-covers')
            const filepath = path.join(coverUploadDir, filename)
            await fs.writeFile(filepath, request.file.buffer)

            response.status(201).json(newBook)
        } catch (error) {
            next(error)
        }
    }
)

booksRouter.delete('/delete-book/:id', middleware.requireTeacherRole, async (request, response, next) => {
    const id = request.params.id

    try {
        await BookService.deleteBook(id)
        response.status(200).json('Book deleted successfully!')
    } catch (error) {
        next(error)
    }
})

export default booksRouter