import express from 'express'
import UserService from '../services/userService.js'
import ProgressService from '../services/progressService.js'
import { z } from 'zod'
import middleware from '../utils/middleware.js'
import bcrypt from 'bcrypt'
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
        response.status(201).json(student) // Why does this return the student's password_hash?
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

const userRegisterSchema = z.object({
    email: z.email(),
    name: z.string(),
    password: z.string().min(8),
    avatar: z.string(),
    //role: z.string(),
    grade: z.number(),
}).strict()

// Unused
usersRouter.post('/register', middleware.requireAuthentication(false), middleware.zValidate(userRegisterSchema), async (request, response, next) => {
    const { email, name, password, avatar, currently_reading, grade, role } = request.validated

    try {
        const newUser = {
            email,
            name,
            password,
            avatar,
            currently_reading,
            grade,
            role
        }
        const createdUser = await UserService.register(newUser)
        const levelAmount = 8
        for (let i = 1; i <= levelAmount; i++) {
            await ProgressService.addNewProgress({
                level: i,
                user: createdUser[0].id
            })
        }
        response.status(201).json(newUser)
    } catch (error) {
        next(error)
    }
})

// Unused
usersRouter.patch('/:id/role', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const { id } = request.params
        const user = await UserService.findById(id)
        const updatedUser = await UserService.updateUserRole(id, user.role)
        response.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
})

const userUpdatePasswordSchema = z.object({
    currentPassword: z.string().min(8),
    password: z.string().min(8)
}).strict()

// Unused
usersRouter.patch('/:id/change-password', middleware.requireAuthentication(true), middleware.zValidate(userUpdatePasswordSchema), async (request, response, next) => {
    try {
        const { id } = request.params
        if (request.user.id !== Number(id)) {
            return response.status(403).json({ error: 'Forbidden' })
        }
        const { currentPassword, password } = request.validated
        const user = await UserService.findById(id)
        const match = await bcrypt.compare(currentPassword, user.password_hash)
        if (!match) {
            const err = new Error('Current password does not match')
            err.status = 400
            throw err
        }
        await UserService.updateUserPassword(id, password)
        response.status(201).json('Password changed successfully')
    } catch (error) {
        next(error)
    }
})

// Unused
usersRouter.get('/profile/:id',
    middleware.requireAuthentication(true),
    async (request, response, next) => {
        if (request.user.role === 'teacher') {
            try {
                if (Number(request.params.id) === request.user.id) {
                    // If teacher is editing own profile, they can edit the name and avatar
                    return response.json({
                        name: request.user.name,
                        avatar: request.user.avatar
                    })
                } else {
                    const user = await UserService.findById(request.params.id)
                    // teacher can edit student name, avatar, grade
                    return response.json({
                        name: user.name,
                        avatar: user.avatar,
                        grade: user.grade
                    })
                }
            } catch (error) {
                next(error)
            }
        } else {
            // students can edit their own avatar
            return response.json({ avatar: request.user.avatar })
        }
    }
)

export default usersRouter