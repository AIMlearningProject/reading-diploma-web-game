import db from '../db/db.js'

const User = {
    async create({ email, name, password_hash, avatar, currently_reading, grade, role, teacher_id }, dbConn = db) {
        return dbConn('users')
            .insert({ email, name, password_hash, avatar, currently_reading, grade, role, teacher_id })
            .returning('id', 'email', 'name', 'avatar', 'currently_reading', 'grade', 'role', 'teacher_id')
    },

    async findByName(name, dbConn = db) {
        return dbConn('users')
            .select('id', 'email', 'name', 'password_hash', 'avatar', 'currently_reading', 'grade', 'role')
            .where({ name })
            .first()
    },

    async findByEmail(email, dbConn = db) {
        return dbConn('users')
            .select('id', 'email', 'name', 'password_hash', 'avatar', 'currently_reading', 'grade', 'role')
            .where({ email })
            .first()
    },

    async findUserById(id, dbConn = db) {
        return dbConn('users')
            .select('id', 'email', 'name', 'password_hash', 'avatar', 'currently_reading', 'grade', 'role', 'teacher_id')
            .where({ id })
            .first()
    },

    async updateUserPassword(id, password_hash, dbConn = db) {
        return dbConn('users')
            .where({ id })
            .update({ password_hash: password_hash })
            .returning('*')
    },

    async findFederatedCredentials(provider, provider_user_id, dbConn = db) {
        return dbConn('federated_credentials')
            .where({ provider, provider_user_id })
            .first()
    },

    async createFederatedCredentials(user_id, provider, provider_user_id, dbConn = db) {
        return dbConn('federated_credentials')
            .insert({ user_id, provider, provider_user_id })
            .returning('*')
    },

    async deleteFederatedCredentials(id, dbConn = db) {
        return dbConn('federated_credentials')
            .where({ id })
            .del()
    },

    async findTeacherByName(name, dbConn = db) {
        return dbConn('users')
            .select('id', 'email', 'name', 'role')
            .whereRaw('LOWER(name) = LOWER(?)', [name])
            .where({ role: 'teacher' })
            .first()
    },

    async findStudentByNameAndTeacher(name, teacherId, dbConn = db) {
        return dbConn('users')
            .select('id', 'email', 'name', 'password_hash', 'avatar', 'currently_reading', 'grade', 'role', 'teacher_id')
            .whereRaw('LOWER(name) = LOWER(?)', [name])
            .where({ teacher_id: teacherId })
            .first()
    },

    async findStudentsByTeacher(teacherId, dbConn = db) {
        return dbConn('users')
            .select('id', 'name', 'email', 'avatar', 'grade', 'role')
            .where({ teacher_id: teacherId, role: 'student' })
    },

    async deleteStudent(teacherId, id, dbConn = db) {
        return dbConn('users')
            .where({ role: 'student', teacher_id: teacherId, id })
            .del()
    },

    async deleteAllStudents(teacherId, dbConn = db) {
        return dbConn('users')
            .where({ teacher_id: teacherId, role: 'student' })
            .del()
    },

    async deleteUser(id, dbConn = db) {
        return dbConn('users')
            .where({ id })
            .del()
    },

    async updateUserProfile(id, name, avatar, grade, email, dbConn = db) {
        const updates = { name, avatar, grade }
        if (email !== undefined) updates.email = email
        return dbConn('users')
            .where({ id })
            .update(updates)
            .returning('*')
    },

    async transferStudentsToTeacher(studentUpdates, toTeacherId, dbConn = db) {
        return dbConn.transaction(async (trx) => {
            const updatedStudents = []

            for (const student of studentUpdates) {
                const [updatedStudent] = await trx('users')
                    .where({ id: student.id })
                    .update({
                        teacher_id: toTeacherId,
                        name: student.name
                    })
                    .returning('*')

                updatedStudents.push(updatedStudent)
            }

            return updatedStudents
        })
    }
}

export default User