import User from '../models/user.js'
import bcrypt from 'bcrypt'

const saltRounds = 12

const UserService = {
    async findByName(name) {
        const user = await User.findByName(name)
        if (!user) {
            const err = new Error(`Could not find user by the name: ${name}`)
            err.userDetails = 'Käyttäjää ei löytynyt'
            err.status = 404
            throw err
        }
        return user
    },

    async findById(id) {
        const user = await User.findUserById(id)
        if (!user) {
            const err = new Error(`Could not find user by the id: ${id}`)
            err.userDetails = 'Käyttäjää ei löytynyt'
            err.status = 404
            throw err
        }
        return user
    },

    async updateUserPassword(id, password) {
        const password_hash = await bcrypt.hash(password, saltRounds)
        return await User.updateUserPassword(id, password_hash)
    },

    /**
     * In the add student form, the email field needs to be left out of the request body entirely
     * if you don't want to add an email to that user, since the email field is optional, but doesn't
     * allow empty values.

     * After adding a student with an email, that student can login with Google using that email.
    */
    async findOrCreateFederatedCredentials(profile) {
        const provider = 'google'
        const providerUserId = profile.id

        const existingFedCred = await User.findFederatedCredentials(provider, providerUserId)

        // If Google account is found, return the user associated with it
        if (existingFedCred) {
            return await User.findUserById(existingFedCred.user_id)
        }

        // Check if a student user has been created for this email
        const student = await User.findByEmail(profile.emails?.[0].value)

        if (student) {
            const [createdUser] = await User.createFederatedCredentials(student.id, provider, providerUserId)
            if (!createdUser.user_id) {
                // If a user couldn't be associated to the google account, federated credentials user needs to be removed,
                // since there is currently no way to associate a user to it after it has been created.
                await User.deleteFederatedCredentials(createdUser.id)
                const err = new Error(`User_id wasn't properly set to federated credentials, Google account is not associated to any user and will therefore not work. Federated credentials removed...`)
                err.userDetails = 'Käyttäjän lisäys epäonnistui.'
                err.status = 500
                throw err
            }
            return { ...student, needsOnboarding: true }
        } else {
            // If no user account exists for this email, create a new teacher account.
            const email = profile.emails?.[0].value ?? null
            const name = profile.name?.givenName || (profile?.displayName ? profile.displayName.split(' ')[0] : '') || ''
            // Searches for the profile picture used in the google account, which will be set as default avatar if found.
            const avatar = profile.photos?.[0]?.value
                ? `${profile.photos[0].value}?sz=200`
                : ''

            const [user] = await User.create({
                email,
                name,
                password_hash: null,
                avatar,
                currently_reading: null,
                grade: 1,
                role: 'teacher'
            })

            const [createdUser] = await User.createFederatedCredentials(user.id, provider, providerUserId)
            if (!createdUser.user_id) {
                await User.deleteFederatedCredentials(createdUser.id)
                const err = new Error(`User_id wasn't properly set to federated credentials, Google account is not associated to any user and will therefore not work. Federated credentials removed...`)
                err.userDetails = 'Käyttäjän lisäys epäonnistui.'
                err.status = 500
                throw err
            }
            return { ...user, needsOnboarding: true }
        }
    },

    async createStudent({ email, name, password, teacherId }) {
        const existing = await User.findStudentByNameAndTeacher(name, teacherId)
        if (existing) {
            const err = new Error('Student name already taken for this teacher')
            err.userDetails = 'Oppilaan nimi varattu, valitse toinen.'
            err.status = 400
            throw err
        }

        if (email) {
            const existingEmail = await User.findByEmail(email)
            if (existingEmail) {
                const err = new Error('Email already taken')
                err.userDetails = 'Sähköposti varattu, valitse toinen.'
                err.status = 400
                throw err
            }
        }

        const password_hash = await bcrypt.hash(password, saltRounds)
        return await User.create({
            email,
            name,
            password_hash,
            role: 'student',
            grade: 1,
            teacher_id: teacherId,
            avatar: ''
        })
    },

    async getStudentsByTeacher(teacherId) {
        return await User.findStudentsByTeacher(teacherId)
    },

    async deleteStudent(teacherId, id) {
        const student = await User.deleteStudent(teacherId, id)
        if (!student) {
            const err = new Error(`Could not find user with id ${id}`)
            err.userDetails = 'Oppilasta ei löytynyt'
            err.status = 404
            throw err
        }
        return student
    },

    async deleteAllStudents(teacherId) {
        return await User.deleteAllStudents(teacherId)
    },

    async deleteUser(id) {
        const user = await User.deleteUser(id)
        if (!user) {
            const err = new Error(`Could not find user with id ${id}`)
            err.userDetails = 'Käyttäjää ei löytynyt'
            err.status = 404
            throw err
        }
        return user
    },

    async updateProfile({ reqId, id, name, avatar, role, grade, email }) {
        if (role === 'student' && reqId !== id) {
            const err = new Error('Request denied, student tried to update someone elses profile')
            err.userDetails = 'Voit muokata vain omaa profiiliasi'
            err.status = 403
            throw err
        }
        const user = await User.findUserById(id)
        // Only allow teachers to edit the profile of THEIR students
        if (role === 'teacher' && reqId !== id && user?.teacher_id !== reqId) {
            const err = new Error('Request denied, teachers can only update the profile of THEIR students')
            err.userDetails = 'Voit muokata vain omaa tai omien oppilaitesi profiilia'
            err.status = 403
            throw err
        }
        if (name && name !== user.name) {
            const existingName = await User.findByName(name)
            if (existingName) {
                const err = new Error('Name already taken')
                err.userDetails = 'Nimi varattu, valitse toinen'
                err.status = 400
                throw err
            }
        }
        if (!grade) grade = user.grade
        if (name !== undefined && !name.trim()) {
            const err = new Error('Name cannot be an empty string')
            err.userDetails = 'Nimi ei voi olla tyhjä'
            err.status = 400
            throw err
        }

        if (email !== undefined && email !== '') {
            const existingEmail = await User.findByEmail(email)
            if (existingEmail && existingEmail.id !== id) {
                const err = new Error('Email already taken')
                err.userDetails = 'Tämä sähköposti on jo jollain käytössä'
                err.status = 400
                throw err
            }
        }
        const emailUpdate = email === undefined ? undefined : (email === '' ? null : email)

        // if editing own profile or teacher editing
        return await User.updateUserProfile(
            id,
            name ?? user.name,
            avatar ?? user.avatar,
            grade,
            emailUpdate
        )
    },

    async transferStudentsToTeacher({ fromTeacherId, toTeacherId }) {
        const studentsFromTeacher = await User.findStudentsByTeacher(fromTeacherId)
        if (!studentsFromTeacher || studentsFromTeacher.length === 0) {
            const err = new Error('No students were found to transfer')
            err.userDetails = 'Ei siirrettäviä oppilaita.'
            err.status = 404
            throw err
        }

        const studentsToTeacher = await User.findStudentsByTeacher(toTeacherId)
        const usedNames = new Set((studentsToTeacher || []).map((student) => student.name?.trim().toLowerCase()))
        const studentsToTransfer = studentsFromTeacher.map((student) => {
            const baseName = student.name?.trim() || 'Opiskelija'
            let finalName = baseName
            let counter = 1

            while (usedNames.has(finalName.toLowerCase())) {
                finalName = `${baseName}${counter}`
                counter += 1
            }

            usedNames.add(finalName.toLowerCase())
            return { id: student.id, name: finalName }
        })

        const updatedStudents = await User.transferStudentsToTeacher(studentsToTransfer, toTeacherId)
        if (!updatedStudents || updatedStudents.length === 0) {
            const err = new Error('No students were transferred (likely no students were found)')
            err.userDetails = 'Oppilaita ei siirretty.'
            err.status = 404
            throw err
        }
        return updatedStudents
    },
}

export default UserService