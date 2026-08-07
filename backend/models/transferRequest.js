import db from '../db/db.js'

const TransferRequest = {
    async create({ requester_teacher_id, recipient_teacher_id, status, message, student_count }, dbConn = db) {
        return dbConn('transfer_requests')
            .insert({ requester_teacher_id, recipient_teacher_id, status, message, student_count })
            .returning('*')
    },

    async findRequestById(id, dbConn = db) {
        return dbConn('transfer_requests')
            .select('id', 'requester_teacher_id', 'recipient_teacher_id', 'status', 'message', 'student_count', 'created_at', 'updated_at')
            .where({ id })
            .first()
    },

    async findPendingByRequesterAndRecipient(requesterTeacherId, recipientTeacherId, dbConn = db) {
        return dbConn('transfer_requests')
            .where({
                requester_teacher_id: requesterTeacherId,
                recipient_teacher_id: recipientTeacherId,
                status: 'pending'
            })
            .first()
    },

    async findPendingRequestsByRequester(requesterTeacherId, dbConn = db) {
        return dbConn('transfer_requests as tr')
            .join('users as recipient', 'recipient.id', 'tr.recipient_teacher_id')
            .select(
                'tr.id',
                'tr.requester_teacher_id',
                'tr.status',
                'tr.message',
                'tr.student_count',
                'tr.created_at',
                'tr.updated_at',
                'recipient.email as recipient_email'
            )
            .where('tr.requester_teacher_id', requesterTeacherId)
            .where({ status: 'pending' })
            .orderBy('tr.created_at', 'desc')
    },

    async findByRecipient(recipientTeacherId, dbConn = db) {
        return dbConn('transfer_requests as tr')
            .join('users as requester', 'requester.id', 'tr.requester_teacher_id')
            .select(
                'tr.id',
                'tr.status',
                'tr.message',
                'tr.student_count',
                'tr.created_at',
                'tr.updated_at',
                'requester.name as requester_name',
                'requester.email as requester_email',
            )
            .where('tr.recipient_teacher_id', recipientTeacherId)
            .orderBy('tr.created_at', 'desc')
    },

    async findByRequester(requesterTeacherId, dbConn = db) {
        return dbConn('transfer_requests as tr')
            .join('users as recipient', 'recipient.id', 'tr.recipient_teacher_id')
            .select(
                'tr.id',
                'tr.status',
                'tr.message',
                'tr.created_at',
                'tr.updated_at',
                'recipient.email as recipient_email'
            )
            .where('tr.requester_teacher_id', requesterTeacherId)
            .orderBy('tr.created_at', 'desc')
    },

    async updateRequestStatus(recipientId, id, status, updated_at, dbConn = db) {
        return dbConn('transfer_requests')
            .where({ recipient_teacher_id: recipientId, id, status: 'pending' })
            .update({ status: status, updated_at })
            .returning('*')
    },

    async deleteRequest(teacherId, id, dbConn = db) {
        return dbConn('transfer_requests')
            .where({ requester_teacher_id: teacherId, id })
            .del()
    },

    async cancelAllPendingRequests(teacherId, updated_at, dbConn = db) {
        return dbConn('transfer_requests')
            .where({ requester_teacher_id: teacherId, status: 'pending' })
            .update({ status: 'cancelled', updated_at })
            .returning('*')
    },
}

export default TransferRequest
