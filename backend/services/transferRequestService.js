import TransferRequest from '../models/transferRequest.js'
import User from '../models/user.js'

const TransferRequestService = {
    async createTransferRequest({ requesterTeacherId, recipientEmail, message, student_count }) {
        if (!recipientEmail) {
            const err = new Error('Recipient email is required')
            err.userDetails = 'Vastaanottajan sähköposti vaaditaan.'
            err.status = 400
            throw err
        }

        if (requesterTeacherId === undefined || requesterTeacherId === null) {
            const err = new Error('Requester teacher id is required')
            err.userDetails = 'Lähettäjä vaaditaan.'
            err.status = 400
            throw err
        }

        const recipient = await User.findByEmail(recipientEmail)
        if (!recipient || recipient.role !== 'teacher') {
            const err = new Error('Recipient teacher not found')
            err.userDetails = 'Vastaanottajaa tällä sähköpostilla ei löytynyt.'
            err.status = 404
            throw err
        }

        if (recipient.id === requesterTeacherId) {
            const err = new Error('You cannot send a transfer request to yourself')
            err.userDetails = 'Et voi lähettää siirtopyyntöä itsellesi.'
            err.status = 400
            throw err
        }

        const existing = await TransferRequest.findPendingByRequesterAndRecipient(requesterTeacherId, recipient.id)
        if (existing) {
            const err = new Error('A pending transfer request already exists')
            err.userDetails = 'Sinulla on jo avoin siirtopyyntö tälle opettajalle.'
            err.status = 409
            throw err
        }

        const [transferRequest] = await TransferRequest.create({
            requester_teacher_id: requesterTeacherId,
            recipient_teacher_id: recipient.id,
            status: 'pending',
            message: message ?? null,
            student_count
        })

        const cleanedRequest = {
            email: recipientEmail,
            status: 'pending',
            message: transferRequest.message,
            student_count,
            created_at: transferRequest.created_at,
            updated_at: transferRequest.updated_at,
        }

        return cleanedRequest
    },

    async findById(id) {
        const foundRequest = await TransferRequest.findRequestById(id)
        if (!foundRequest) {
            const err = new Error(`Could not find request by the id: ${id}`)
            err.userDetails = 'Siirtopyyntöä ei löytynyt?!'
            err.status = 404
            throw err
        }
        return foundRequest
    },

    async listRequestsForTeacher(teacherId) {
        const requests = await TransferRequest.findByRecipient(teacherId)
        return requests || []
    },

    async listRequestsByTeacher(teacherId) {
        const requests = await TransferRequest.findByRequester(teacherId)
        return requests || []
    },

    async listPendingRequestsByTeacher(teacherId) {
        const requests = await TransferRequest.findPendingRequestsByRequester(teacherId)
        return requests || []
    },

    async acceptRequestForTeacher(recipientId, requestId) {
        const updated_at = new Date().toISOString()
        const [updatedRequest] = await TransferRequest.updateRequestStatus(recipientId, requestId, 'accepted', updated_at)
        if (!updatedRequest) {
            const err = new Error(`Could not find request by id: ${requestId}`)
            err.userDetails = 'Siirtopyyntöä ei löytynyt?!'
            err.status = 404
            throw err
        }
        return updatedRequest
    },

    async rejectRequestForTeacher(recipientId, requestId) {
        const updated_at = new Date().toISOString()
        const [updatedRequest] = await TransferRequest.updateRequestStatus(recipientId, requestId, 'rejected', updated_at)
        if (!updatedRequest) {
            const err = new Error(`Could not find request by id: ${requestId}`)
            err.userDetails = 'Siirtopyyntöä ei löytynyt?!'
            err.status = 404
            throw err
        }
        return updatedRequest
    },

    async deleteRequestByTeacher(teacherId, id) {
        const deletedRequest = await TransferRequest.deleteRequest(teacherId, id)
        if (!deletedRequest) {
            const err = new Error(`Could not find request with id ${id}`)
            err.userDetails = 'Siirtopyyntöä ei löytynyt?!'
            err.status = 404
            throw err
        }
        return deletedRequest
    },

    async cancelAllPendingRequests(requesterId) {
        const updated_at = new Date().toISOString()
        const cancelledRequests = await TransferRequest.cancelAllPendingRequests(requesterId, updated_at)
        if (!cancelledRequests) {
            const err = new Error(`Could not find requests for teacher with id ${requesterId}`)
            err.userDetails = 'Siirtopyyntöjä ei löytynyt.'
            err.status = 404
            throw err
        }
        return cancelledRequests
    },
}

export default TransferRequestService
