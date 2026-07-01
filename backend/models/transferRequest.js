import db from '../db/db.js'

const TransferRequest = {
    async create({ requester_teacher_id, recipient_teacher_id, status, message }, dbConn = db) {
        return dbConn('transfer_requests')
            .insert({ requester_teacher_id, recipient_teacher_id, status, message })
            .returning('*')
    },

    async findRequestById(id, dbConn = db) {
        return dbConn('transfer_requests')
            .select('id', 'requester_teacher_id', 'recipient_teacher_id', 'status', 'message', 'created_at', 'updated_at')
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

    // Returns the transfer requests for a specific recipient along with recipient email.
    async findPendingRequest(rquesterTeacherId, dbConn = db) {
        return dbConn('transfer_requests as tr')
            .join('users as recipient', 'recipient.id', 'tr.recipient_teacher_id')
            .select(
                'tr.id',
                'tr.requester_teacher_id',
                'tr.recipient_teacher_id',
                'tr.status',
                'tr.message',
                'tr.created_at',
                'tr.updated_at',
                'recipient.email as recipient_email'
            )
            .where('tr.requester_teacher_id', rquesterTeacherId)
            .where({ status: 'pending' })
            .orderBy('tr.created_at', 'desc')
    },

    // Returns the transfer requests for a specific recipient along with requester and recipient name and email.
    async findByRecipient(recipientTeacherId, dbConn = db) {
        return dbConn('transfer_requests as tr')
            .join('users as requester', 'requester.id', 'tr.requester_teacher_id')
            .select(
                'tr.id',
                /*'tr.requester_teacher_id',
                'tr.recipient_teacher_id',*/
                'tr.status',
                'tr.message',
                'tr.created_at',
                'tr.updated_at',
                'requester.name as requester_name',
                'requester.email as requester_email',
                /*'recipient.name as recipient_name',
                'recipient.email as recipient_email'*/
            )
            .where('tr.recipient_teacher_id', recipientTeacherId)
            .orderBy('tr.created_at', 'desc')
    },

    // Returns the requests for a specific requester along with recipient email
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

    async deleteAllRequests(teacherId, dbConn = db) {
        return dbConn('transfer_requests')
            .where({ requester_teacher_id: teacherId })
            .del()
    },
}

export default TransferRequest
