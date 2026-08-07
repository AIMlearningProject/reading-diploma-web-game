import express from 'express'
import UserService from '../services/userService.js'
import ProgressService from '../services/progressService.js'
import { z } from 'zod'
import middleware from '../utils/middleware.js'
import TeacherInviteService from '../services/teacherInviteService.js'

const usersRouter = express.Router()

// Must be defined BEFORE /:id route
usersRouter.get('/my-students', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const students = await UserService.getStudentsByTeacher(request.user.id)
        response.json(students)
    } catch (error) {
        next(error)
    }
})

// Deletes all students and student transfer requests from this teacher
usersRouter.delete('/my-students', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const requesterId = request.user.id
        const students = await UserService.getStudentsByTeacher(requesterId)
        if (students || students.length > 0) {
            await UserService.deleteAllStudents(requesterId)
        }
        response.status(204).end()
    } catch (error) {
        next(error)
    }
})

const studentCreateSchema = z.object({
    email: z.email().optional(),
    name: z.string().min(3),
    password: z.string().min(3),
}).strict()

usersRouter.post('/students', middleware.requireTeacherRole, middleware.zValidate(studentCreateSchema), async (request, response, next) => {
    try {
        const { email, name, password } = request.validated
        const student = await UserService.createStudent({
            email,
            name,
            password,
            teacherId: request.user.id
        })

        const levelAmount = 8
        for (let i = 1; i <= levelAmount; i++) {
            await ProgressService.addNewProgress({
                level: i,
                user: student[0].id
            })
        }
        response.status(201).json(student)
    } catch (error) {
        next(error)
    }
})

const studentInviteSchema = z.object({
    email: z.email().optional(),
    name: z.string().min(3),
    password: z.string().min(3),
    token: z.string(),
}).strict()

usersRouter.post('/invite/student', middleware.requireAuthentication(false), middleware.zValidate(studentInviteSchema), async (request, response, next) => {
    try {
        const { email, name, password, token } = request.validated

        const teacherId = await TeacherInviteService.verifyToken(token)
        const [student] = await UserService.createStudent({
            email,
            name,
            password,
            teacherId,
        })

        const levelAmount = 8
        for (let i = 1; i <= levelAmount; i++) {
            await ProgressService.addNewProgress({
                level: i,
                user: student.id
            })
        }

        const teacher = await UserService.findById(teacherId)
        const sanitizedStudentInfo = {
            id: student.id,
            name: student.name,
            email: student.email,
            grade: student.grade,
            teacher_name: teacher.name
        }

        response.status(201).json(sanitizedStudentInfo)
    } catch (error) {
        next(error)
    }
})

usersRouter.delete('/students/:id', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const student = await UserService.findById(request.params.id)
        if (!student || student.teacher_id !== request.user.id) {
            return response.status(403).json({ error: 'Forbidden' })
        }
        await UserService.deleteStudent(request.user.id, request.params.id)
        response.status(204).end()
    } catch (error) {
        next(error)
    }
})

usersRouter.delete('/', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const userId = request.user.id
        const user = await UserService.findById(userId)
        if (!user) {
            return response.status(403).json({ error: 'Forbidden' })
        }

        await new Promise((resolve, reject) => {
            request.logout((logoutError) => {
                if (logoutError) {
                    return reject(logoutError)
                }

                request.session.destroy((sessionError) => {
                    if (sessionError) {
                        return reject(sessionError)
                    }

                    response.clearCookie('connect.sid')
                    response.clearCookie('X-CSRF-TOKEN')
                    resolve()
                })
            })
        })

        await UserService.deleteUser(user.id)
        return response.status(204).end()
    } catch (error) {
        next(error)
    }
})

const studentPasswordResetSchema = z.object({
    password: z.string().min(3),
}).strict()

usersRouter.patch('/students/:id/password', middleware.requireTeacherRole, middleware.zValidate(studentPasswordResetSchema), async (request, response, next) => {
    try {
        const student = await UserService.findById(request.params.id)
        if (!student || student.teacher_id !== request.user.id) {
            return response.status(403).json({ error: 'Forbidden' })
        }
        await UserService.updateUserPassword(request.params.id, request.validated.password)
        response.status(204).end()
    } catch (error) {
        next(error)
    }
})

const profileUpdateSchema = z.object({
    name: z.string().optional(),
    avatar: z.string().optional(),
    grade: z.string().optional(),
    email: z.union([z.email(), z.literal('')]).optional(),
}).strict()

usersRouter.patch('/profile/:id',
    middleware.zValidate(profileUpdateSchema),
    middleware.requireAuthentication(true),
    async (request, response, next) => {
        const { name, avatar, grade, email } = request.validated

        try {
            const userToUpdate = {
                reqId: request.user.id,
                id: Number(request.params.id),
                name,
                avatar,
                role: request.user.role,
                grade,
                email,
            }

            const updatedUser = await UserService.updateProfile(userToUpdate)

            response.status(204).json(updatedUser)
        } catch (error) {
            next(error)
        }
    }
)

export default usersRouter