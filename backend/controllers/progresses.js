import express from 'express'
import ProgressService from '../services/progressService.js'
import { z } from 'zod'
import middleware from '../utils/middleware.js'

const progressRouter = express.Router()

// Gets progress entries for the user making the request
progressRouter.get('/', middleware.requireAuthentication(true), async (request, response, next) => {
    try {
        const progress = await ProgressService.findByUser(request.user.id)
        response.status(200).json(progress)
    } catch (error) {
        next(error)
    }
})

// Gets progress entries for a specific student under the teacher making the request
progressRouter.get('/student/:id', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const progress = await ProgressService.findByUserAndTeacher({ userId: request.params.id, teacherId: request.user.id })
        response.status(200).json(progress)
    } catch (error) {
        next(error)
    }
})

const LevelCompleteSchema = z.object({
    user: z.number()
}).strict()

progressRouter.put('/:level/completed', middleware.requireAuthentication(true), middleware.zValidate(LevelCompleteSchema), async (request, response, next) => {
    const level = request.params.level
    const { user } = request.validated

    try {
        await ProgressService.completeLevel(level, { user })
        response.status(200).json('Level marked as completed successfully!')
    } catch (error) {
        next(error)
    }
})

const CurrentProgressSchema = z.object({
    current_progress: z.number().min(0).max(100)
}).strict()

progressRouter.put('/:level/current-progress', middleware.requireAuthentication(true), middleware.zValidate(CurrentProgressSchema), async (request, response, next) => {
    const level = request.params.level
    const { current_progress } = request.validated

    try {
        const progressEntry = await ProgressService.updateCurrentProgress(level, { user: request.user.id, current_progress })
        response.status(200).json(progressEntry)
    } catch (error) {
        next(error)
    }
})

const statusTypes = z.enum(['incomplete', 'complete', 'reviewed', 'resubmit'])
const LevelStatusSchema = z.object({
    user: z.number(),
    status: statusTypes
}).strict()

progressRouter.put('/:level/status', middleware.requireTeacherRole, middleware.zValidate(LevelStatusSchema), async (request, response, next) => {
    const level = request.params.level
    const { user, status } = request.validated
    const teacherId = request.user.id

    try {
        const progressEntry = await ProgressService.changeLevelStatus(level, { user, status, teacherId })
        response.status(200).json(progressEntry)
    } catch (error) {
        next(error)
    }
})

const addBookToEntrySchema = z.object({
    book: z.number()
}).strict()

progressRouter.put('/:level/add-book', middleware.requireAuthentication(true), middleware.zValidate(addBookToEntrySchema), async (request, response, next) => {
    const level = request.params.level
    const { book } = request.validated

    try {
        await ProgressService.changeBookinEntry(level, request.user.id, book)
        response.status(200).json('Book added to entry successfully!')
    } catch (error) {
        next(error)
    }
})

export default progressRouter
