import express from 'express'
import { z } from 'zod'
import middleware from '../utils/middleware.js'
import TransferRequestService from '../services/transferRequestService.js'
import UserService from '../services/userService.js'

const transferRequestsRouter = express.Router()

const transferStudentsSchema = z.object({
    recipientEmail: z.email(),
    message: z.string().optional()
}).strict()

// Send transfer request to another teacher
transferRequestsRouter.post('/', middleware.requireTeacherRole, middleware.zValidate(transferStudentsSchema), async (request, response, next) => {
    const { recipientEmail, message } = request.validated
    try {
        const students = await UserService.getStudentsByTeacher(request.user.id)
        if (!students || students.length === 0) {
            return response.status(400).json({ error: 'Ei siirrettäviä oppilaita' })
        }

        const transferRequests = await TransferRequestService.listPendingRequestsByTeacher(request.user.id)
        if (transferRequests.length >= 3) {
            return response.status(400).json({ error: 'Voit lähettää enintään 3 pyyntöä kerralla' })
        }

        const transferRequest = await TransferRequestService.createTransferRequest({
            requesterTeacherId: request.user.id,
            recipientEmail,
            message,
            student_count: students.length
        })

        response.status(201).json(transferRequest)
    } catch (error) {
        next(error)
    }
})

// Get transfer requests sent to you
transferRequestsRouter.get('/inbox', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const transferRequests = await TransferRequestService.listRequestsForTeacher(request.user.id)
        response.json(transferRequests)
    } catch (error) {
        next(error)
    }
})

// Get transfer requests that you have sent
transferRequestsRouter.get('/outbox', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const transferRequests = await TransferRequestService.listRequestsByTeacher(request.user.id)
        response.json(transferRequests)
    } catch (error) {
        next(error)
    }
})

// Accept transfer request
transferRequestsRouter.patch('/:id/accept', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const recipientId = request.user.id
        const requestId = request.params.id

        const updatedTransferRequest = await TransferRequestService.acceptRequestForTeacher(recipientId, requestId)
        await TransferRequestService.cancelAllPendingRequests(updatedTransferRequest.requester_teacher_id)
        await UserService.transferStudentsToTeacher({
            fromTeacherId: updatedTransferRequest.requester_teacher_id,
            toTeacherId: recipientId
        })
        response.status(200).json(updatedTransferRequest)
    } catch (error) {
        next(error)
    }
})

// Reject transfer request
transferRequestsRouter.patch('/:id/reject', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const recipientId = request.user.id
        const requestId = request.params.id

        const updatedTransferRequest = await TransferRequestService.rejectRequestForTeacher(recipientId, requestId)
        response.status(200).json(updatedTransferRequest)
    } catch (error) {
        next(error)
    }
})

// Delete sent transfer request
transferRequestsRouter.delete('/:id', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const requesterId = request.user.id
        const requestId = request.params.id

        const foundRequest = await TransferRequestService.findById(requestId)
        if (!foundRequest || foundRequest.requester_teacher_id !== requesterId) {
            return response.status(403).json({ error: 'Forbidden' })
        }

        await TransferRequestService.deleteRequestByTeacher(requesterId, requestId)
        return response.status(204).end()
    } catch (error) {
        next(error)
    }
})

export default transferRequestsRouter