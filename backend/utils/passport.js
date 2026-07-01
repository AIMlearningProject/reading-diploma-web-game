import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as LocalStrategy } from 'passport-local'
import UserService from '../services/userService.js'
import bcrypt from 'bcrypt'

const DUMMY_BCRYPT_HASH = '$2b$12$FYjC1oNXGVavNcrWAixpY.VpQDc8Rs2hYQJJ3rA8519NlrAacdEqq'

// !! vv !!
// After Google login, passport gets the user profile unsing findById
// On every request the deserializeUser function loads the full user from the database into request.user <---
// ^^ ^^^^^ ^^^^^^^                                                                         ^^^^^^^^^^^^
// The following statement can be used to forbid access to resources if not logged in using passport
/*if (!request.isAuthenticated()) {
    const err = new Error('Access denied')
    err.name = 'AuthError'
    err.message = error.message <-- can be used to define the message shown to the user
    err.status = 401
    throw err
}*/
// !! ^^ !!

passport.use(new LocalStrategy(
    // What the frontend needs to send in order for this to work
    /*
        <input name="identifier" placeholder="username">
        <input name="password" type="password">
        Optional: <input name="teacher_name"> for student login under a teacher
    */
    { usernameField: 'identifier', passReqToCallback: true },
    async (req, identifier, password, done) => {
        try {
            let user
            const teacherName = req.body.teacher_name

            const User = (await import('../models/user.js')).default
            if (teacherName) {
                // Student login: look up teacher by name, then find student under that teacher
                const teacher = await User.findTeacherByName(teacherName)
                if (teacher) {
                    user = await User.findStudentByNameAndTeacher(identifier, teacher.id)
                }
            } else {
                user = await User.findByName(identifier)
            }

            const storedHash = user?.password_hash ?? DUMMY_BCRYPT_HASH
            const valid = await bcrypt.compare(password, storedHash)

            if (!user || !valid) {
                return done(null, false, { message: 'Väärä nimi tai salasana' })
            }

            return done(null, user) // user still contains password_hash here
        } catch (error) {
            return done(error)
        }
    }
))

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
    },
    // The accessToken below would be used to make API calls to Google services on behalf of the user
    // Services like Google calendar, Gmail, Google Drive
    // The refreshToken would be used to refresh the accessToken that expires in 1 hour
    async function (accessToken, refreshToken, profile, done) {
        try {
            const user = await UserService.findOrCreateFederatedCredentials(profile)
            // user.needsOnboarding can be used to redirect the user
            // to a sign in page where they will fill out their name, avatar and grade

            return done(null, user)
        } catch (error) {
            return done(error, null)
        }
    })
)

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserService.findById(id)
        if (!user.id) {
            return done(new Error('User not found'), null)
        }
        done(null, user)
    } catch (error) {
        done(error, null)
    }
})

export default passport