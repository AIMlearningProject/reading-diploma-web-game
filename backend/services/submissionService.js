import Submission from '../models/submission.js'

const SubmissionService = {
    async createSubmission({ user, completedLevel, question1, answer1, question2, answer2, question3, answer3 }) {
        const exists = await Submission.getSpecific(user, completedLevel)
        if (exists) {
            const err = new Error('User has already submitted this question on this level')
            err.status = 400
            throw err
        }
        return Submission.create({
            user,
            completedLevel,
            question1,
            answer1,
            question2,
            answer2,
            question3,
            answer3
        })
    },

    async updateSubmission({ user, completedLevel, question1, answer1, question2, answer2, question3, answer3 }) {
        const exists = await Submission.getSpecific(user, completedLevel)
        if (!exists) {
            const err = new Error(`No submission entry found for this student`)
            err.userDetails = 'Opiskelija ei ole vastannut tämän tason kysymyksiin'
            err.status = 404
            throw err
        } else {
            return Submission.update({
                user,
                completedLevel,
                question1,
                answer1,
                question2,
                answer2,
                question3,
                answer3
            })
        }
    },

    async findByUserAndTeacher({ userId, teacherId }) {
        const submissions = await Submission.getSubmissionsForTeacherByStudent(userId, teacherId)
        if (!submissions || submissions.length === 0) {
            const err = new Error(`No submission entries found for this student or student isn't under this teacher`)
            err.userDetails = 'Opettaja ei opeta tätä opiskelijaa tai opiskelija ei ole vastannut yhdenkään tason kysymyksiin'
            err.status = 404
            throw err
        }
        return submissions
    },

    async findByUser(userId) {
        const submissions = await Submission.findByUser(userId)
        if (!submissions || submissions.length === 0) {
            const err = new Error(`No submission entries found for this user`)
            err.userDetails = 'Et ole vastannut yhdenkään tason kysymyksiin'
            err.status = 404
            throw err
        }
        return submissions
    },
}

export default SubmissionService