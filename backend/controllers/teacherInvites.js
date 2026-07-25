import express from 'express'
import middleware from '../utils/middleware.js'
import TeacherInviteService from '../services/teacherInviteService.js'

const teacherInvitesRouter = express.Router()

// Get invite link for current teacher
teacherInvitesRouter.get('/', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const invite = await TeacherInviteService.getInvite(request.user.id)
        const token = await TeacherInviteService.generateToken(invite.invite_secret, request.user.id)

        // To create the link, in frontend do: `${window.location.origin}/sign-up/student?token=${inviteToken}&teacher=${teacherName}`
        response.status(200).json({
            inviteToken: token,
            active: invite.active,
            expires_at: invite.expires_at,
            created_at: invite.created_at,
            updated_at: invite.updated_at
        })
    } catch (error) {
        next(error)
    }
})

// Regenerates a new invite link invalidating all previous links
teacherInvitesRouter.post('/regenerate', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const invite = await TeacherInviteService.regenerateSecret(request.user.id)
        const token = await TeacherInviteService.generateToken(invite.invite_secret, request.user.id)

        response.status(200).json({
            inviteToken: token,
            active: invite.active,
            expires_at: invite.expires_at,
            created_at: invite.created_at,
            updated_at: invite.updated_at
        })
    } catch (error) {
        next(error)
    }
})

// Enable/disable invite link (active = true/false)
teacherInvitesRouter.patch('/toggle', middleware.requireTeacherRole, async (request, response, next) => {
    try {
        const invite = await TeacherInviteService.toggleActive(request.user.id)
        const token = await TeacherInviteService.generateToken(invite.invite_secret, request.user.id)

        response.status(200).json({
            inviteToken: token,
            active: invite.active,
            expires_at: invite.expires_at,
            created_at: invite.created_at,
            updated_at: invite.updated_at
        })
    } catch (error) {
        next(error)
    }
})

export default teacherInvitesRouter