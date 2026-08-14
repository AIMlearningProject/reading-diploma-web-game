import 'dotenv/config'
import logger from './utils/logger.js'
import middleware from './utils/middleware.js'
import express from 'express'
import cors from 'cors'

import usersRouter from './controllers/users.js'
import booksRouter from './controllers/books.js'
import authRouter from './controllers/auth.js'
import progressRouter from './controllers/progresses.js'
import rewardsRouter from './controllers/rewards.js'
import submissionsRouter from './controllers/submissions.js'
import transferRequestsRouter from './controllers/transferRequests.js'
import teacherInvitesRouter from './controllers/teacherInvites.js'

import session from 'express-session'
// Memorystore ∨∨∨ is good for single instance apps (dev/small app), Redis might be better for scaling,
// because it provides multi-instance rate limit counters. Whomever it may consern: Consider this before scaling.
import memorystore from 'memorystore'
import passport from './utils/passport.js'
import lusca from 'lusca'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

// derive __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

logger.info('Connecting')

// Check environment mode development/production/test
const environmentMode = process.env.NODE_ENV || 'development'
const domainUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '') // Also removes trailing slash

if (environmentMode === 'production' && !domainUrl.startsWith('http://') && !domainUrl.startsWith('https://')) {
    logger.error(`Invalid PUBLIC_URL ${process.env.PUBLIC_URL}. Needs to begin with http:// or https://`)
    process.exit(1)
}

const frontendOrigin = environmentMode === 'production'
    // In production the PUBLIC_URL should be set to the public domain
    ? domainUrl
    // Assumes frontend is running on 'http://localhost:5173' in non production environments
    : 'http://localhost:5173'

// Allows JavaScript from only this specific origin to read responses
const CORS_OPTIONS = {
    origin: frontendOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN']
}

app.use(cors(CORS_OPTIONS))
const MemoryStore = memorystore(session)

// Express session middleware
const sessionCookieSecure = environmentMode === 'production' && domainUrl.startsWith('https://')
app.use(session({
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    secure: sessionCookieSecure,
    store: new MemoryStore({
        checkPeriod: 43200000 // prune expired entries every 12h, to avoid memory leaks
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax' } // Google OAuth doesn't work in production if this is 'strict'
}))

app.use(express.json())

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// The X-CSRF-TOKEN header in the frontend is set for every request in service/api.js
if (environmentMode === 'production') {
    app.use(lusca({
        // Every method besides GET requires the X-CSRF-TOKEN header!!!
        // Cookie option here generates a new X-CSRF-TOKEN
        // and header option sends it to the client on every request
        csrf: {
            cookie: 'X-CSRF-TOKEN',
            header: 'X-CSRF-TOKEN',
        },
        nosniff: true,
    }))

    if (domainUrl === 'https://lukudiplomi.onrender.com') {
        app.set('trust proxy', ['74.220.51.0/24', '74.220.59.0/24'])
    }
} else {
    // prints all requests in the console (not required during production)
    app.use(middleware.requestLogger)
}

// ∨∨∨ Rate limiting for all requests to prevent denial of service attacks
// Helper for creating limiters
const makeLimiter = ({ windowMs, max, message }) => {
    const baseLimiterOptions = {
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            const retryAfter = req.rateLimit?.resetTime
                ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
                : Math.ceil(windowMs / 1000)

            return res.status(429).json({
                error: message || `Liian monta pyyntöä. Yritä uudelleen ${retryAfter} sekunnin kuluttua.`
            })
        }
    }
    if (process.env.NODE_ENV === 'production' && domainUrl === 'https://lukudiplomi.onrender.com') {
        return rateLimit({
            ...baseLimiterOptions,
            keyGenerator: (req) => {
                const realIP = req.headers['true-client-ip'] || req.headers['true-client-ip'.toLowerCase()]
                return realIP || ipKeyGenerator(req.ip)
            },
        })
    } else {
        return rateLimit(baseLimiterOptions)
    }
}

// ∨∨∨ Adjust these if needed
const authLimiter = makeLimiter({
    // {max} requests per {windowMs} milliseconds
    windowMs: 60 * 1000,
    max: 20, // 20 requests per minute allowed to the auth routes per client
})

const userLimiter = makeLimiter({
    windowMs: 60 * 1000,
    max: 80, // 80 requests per minute allowed for user related requests
})

const trLimiter = makeLimiter({
    // For transfer requests
    windowMs: 60 * 1000,
    max: 50,
})

const tiLimiter = makeLimiter({
    // For invite link related requests
    windowMs: 60 * 1000,
    max: 20,
})

const apiLimiter = makeLimiter({
    // For other api routes
    windowMs: 60 * 1000,
    max: 150,
})

const indexLimiter = makeLimiter({
    // For fronted routes in production env (welcomepage, loginpage etc.)
    windowMs: 60 * 1000,
    max: 250,
})

const uploadPath = path.resolve(__dirname, 'public', 'uploads')
const assetPath = path.resolve(__dirname, 'public', 'assets')
app.use('/uploads', express.static(uploadPath))
app.use('/assets', express.static(assetPath))

app.use('/auth', authLimiter, authRouter)
app.use('/api/users', userLimiter, usersRouter)
app.use('/api/transfer-requests', trLimiter, transferRequestsRouter)
app.use('/api/invite', tiLimiter, teacherInvitesRouter)
app.use('/api/books', apiLimiter, booksRouter)
app.use('/api/progress', apiLimiter, progressRouter)
app.use('/api/rewards', apiLimiter, rewardsRouter)
app.use('/api/submissions', apiLimiter, submissionsRouter)

if (environmentMode === 'production') {
    const distPath = path.resolve(__dirname, '../frontend/dist')

    // Serves the frontend statically from the dist build folder
    app.use(express.static(distPath))

    // SPA fallback for client-side routing
    // Without this, non API routes e.g., /student/dashboard will produce a 404 error
    app.get('*', indexLimiter, (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'))
    })
}

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

export default app
