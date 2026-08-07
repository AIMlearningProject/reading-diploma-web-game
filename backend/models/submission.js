import db from '../db/db.js'

const Submission = {
    async create({ user, completedLevel, question1, answer1, question2, answer2, question3, answer3 }, dbConn = db) {
        user = Number(user)
        completedLevel = Number(completedLevel)
        return dbConn('submissions')
            .insert({ user: user, question1: question1, answer1: answer1, completedLevel: completedLevel, question2: question2, answer2: answer2, question3: question3, answer3: answer3 })
            .returning('*')
    },

    async update({ user, completedLevel, question1, answer1, question2, answer2, question3, answer3 }, dbConn = db) {
        user = Number(user)
        completedLevel = Number(completedLevel)
        return dbConn('submissions')
            .where({ user: user, completedLevel: completedLevel })
            .update({ question1: question1, answer1: answer1, question2: question2, answer2: answer2, question3: question3, answer3: answer3 })
            .returning('*')
    },

    async getSpecific(user, completedLevel, dbConn = db) {
        return dbConn('submissions')
            .select('user', 'question1', 'answer1', 'completedLevel', 'question2', 'answer2', 'question3', 'answer3')
            .where({ user: user, completedLevel: completedLevel })
            .first()
    },

    async findByUser(userId, dbConn = db) {
        userId = Number(userId)
        return dbConn('submissions')
            .select('id', 'user', 'completedLevel', 'question1', 'answer1', 'question2', 'answer2', 'question3', 'answer3')
            .where('user', userId)
    },

    async getSubmissionsForTeacherByStudent(userId, teacherId, dbConn = db) {
        userId = Number(userId)
        teacherId = Number(teacherId)
        return dbConn('submissions')
            .select('user', 'completedLevel', 'question1', 'answer1', 'question2', 'answer2', 'question3', 'answer3')
            .innerJoin('users', 'users.id', 'submissions.user')
            .where('submissions.user', userId)
            .andWhere('users.teacher_id', teacherId)
            .andWhere('users.role', 'student')
    },
}

export default Submission