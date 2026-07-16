import BookService from '../services/bookService.js'
import express from 'express'
import { z } from 'zod'
import multer from 'multer'
import middleware from '../utils/middleware.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'

const booksRouter = express.Router()

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
// Note: file uploads are handled by multer (upload.single('coverimage')).
// We do NOT validate the file with zod here because multer parses multipart
// bodies and places the file on `request.file`.

// ∨∨∨ For uploading cover images
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!allowedImageTypes.includes(file.mimetype)) {
            const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)
            err.message = 'Vain kuvatiedostot ovat sallittuja (jpg, png, webp).'
            err.name = 'MulterError'
            return cb(err, false)
        }
        cb(null, true)
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

        const { title: rawTitle, author: rawAuthor, booktype, page_count } = request.validated

        try {
            if (request.file) {
                // Compress image and check file size
                const optimizedBuffer = await sharp(request.file.buffer)
                    .resize(600, 900, { fit: 'inside' })
                    .jpeg({ quality: 75 })
                    .toBuffer()

                const maxCompressedSize = 1 * 1024 * 1024 // 1 MB

                if (optimizedBuffer.length > maxCompressedSize) {
                    return response.status(400).json({ error: 'Image too large' })
                }

                // Generate a safe filename
                const extensionMap = {
                    'image/jpeg': '.jpg',
                    'image/png': '.png',
                    'image/webp': '.webp'
                }

                const extension = extensionMap[request.file.mimetype]
                const filename = `${Date.now()}-${crypto.randomUUID() + extension}`

                const bookToCreate = {
                    title: normalize(rawTitle),
                    author: normalize(rawAuthor),
                    coverimage: `/uploads/book-covers/${filename}`,
                    booktype,
                    page_count,
                    added_by: request.user.id
                }
                const createdBook = await BookService.addBook(bookToCreate)

                // Write file to disk only after all validations have passed
                const coverUploadDir = path.resolve(__dirname, '../public/uploads/book-covers')
                const filepath = path.join(coverUploadDir, filename)
                await fs.writeFile(filepath, optimizedBuffer)

                response.status(201).json(createdBook)
            } else {
                const bookToCreate = {
                    title: normalize(rawTitle),
                    author: normalize(rawAuthor),
                    coverimage: '/uploads/book-covers/defaultNoImg.ico',
                    booktype,
                    page_count,
                    added_by: request.user.id
                }

                const createdBook = await BookService.addBook(bookToCreate)
                response.status(201).json(createdBook)
            }
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

// Unused
booksRouter.get('/', middleware.requireAuthentication(true), async (request, response, next) => {
    try {
        const books = await BookService.getAllBooks()
        response.json(books)
    } catch (error) {
        next(error)
    }
})

// Unused
booksRouter.get('/:id', middleware.requireAuthentication(true), async (request, response, next) => {
    const { id } = request.params
    try {
        const book = await BookService.findBookById(id)
        response.json(book)
    } catch (error) {
        next(error)
    }
})

export default booksRouter