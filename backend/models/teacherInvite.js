import db from '../db/db.js'

const TeacherInvite = {
    async create({ teacher_id, invite_secret, active, expires_at }, dbConn = db) {
        return dbConn('teacher_invites')
            .insert({ teacher_id, invite_secret, active, expires_at })
            .returning('*')
    },

    async findByTeacher(teacher_id, dbConn = db) {
        return dbConn('teacher_invites')
            .select('id', 'teacher_id', 'invite_secret', 'active', 'expires_at', 'created_at', 'updated_at')
            .where({ teacher_id })
            .first()
    },

    async regenerate(teacher_id, invite_secret, updated_at, dbConn = db) {
        return dbConn('teacher_invites')
            .where({ teacher_id })
            .update({ invite_secret, updated_at })
            .returning('*')
    },

    async swapActive(teacher_id, active, updated_at, dbConn = db) {
        return dbConn('teacher_invites')
            .where({ teacher_id })
            .update({ active, updated_at })
            .returning('*')
    },
}

export default TeacherInvite
