import TeacherInvite from '../models/teacherInvite.js'
import crypto from 'crypto'

const INVITE_SECRET = process.env.INVITE_SECRET

function randomSecret() {
    return crypto.randomBytes(32).toString('hex')
}

function sign(payload, inviteSecret) {
    return crypto
        .createHmac('sha256', INVITE_SECRET + inviteSecret)
        .update(payload)
        .digest('hex')
}

const TeacherInviteService = {
    async getInvite(teacherId) {
        let invite = await TeacherInvite.findByTeacher(teacherId)

        if (!invite) {
            [invite] = await TeacherInvite.create({
                teacher_id: teacherId,
                invite_secret: randomSecret(),
                active: true,
                expires_at: null
            })
        }

        return invite
    },

    generateToken(inviteSecret, teacherId) {
        const payload = JSON.stringify({ teacherId, ts: Date.now() })

        const signature = sign(payload, inviteSecret)
        return Buffer.from(payload).toString('base64') + '.' + signature
    },

    async regenerateSecret(teacherId) {
        const foundInvite = await TeacherInvite.findByTeacher(teacherId)
        if (!foundInvite) {
            const err = new Error(`Could not find invite link by the teacher_id: ${teacherId}`)
            err.userDetails = 'Oppilaan luonti linkkiä ei löytynyt?!'
            err.status = 404
            throw err
        }

        const newSecret = randomSecret()
        const updated_at = new Date().toISOString()

        const [invite] = await TeacherInvite.regenerate(teacherId, newSecret, updated_at)
        return invite
    },

    async toggleActive(teacherId) {
        const foundInvite = await TeacherInvite.findByTeacher(teacherId)
        if (!foundInvite) {
            const err = new Error(`Could not find invite link by the teacher_id: ${teacherId}`)
            err.userDetails = 'Oppilaan luonti linkkiä ei löytynyt?!'
            err.status = 404
            throw err
        }

        const updated_at = new Date().toISOString()
        const [invite] = await TeacherInvite.swapActive(teacherId, !foundInvite.active, updated_at)
        return invite
    },

    async verifyToken(token) {
        function invalidTokenErr(msg) {
            const err = new Error(msg)
            err.userDetails = 'Virheellinen kutsulinkki'
            err.status = 400
            return err
        }

        if (typeof token !== 'string' || !token.includes('.')) {
            throw invalidTokenErr(`Invalid invite token`)
        }

        const [payloadB64, signature] = token.split('.')
        let payloadJson
        let payload
        try {
            payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8')
            payload = JSON.parse(payloadJson)
        } catch (err) {
            throw invalidTokenErr(`Invalid invite token: ${err}`)
        }

        if (!payload.teacherId) {
            throw invalidTokenErr(`Invalid invite token`)
        }

        const invite = await TeacherInvite.findByTeacher(payload.teacherId)
        if (!invite) throw invalidTokenErr(`Invalid invite token`)

        const expectedSig = sign(payloadJson, invite.invite_secret)
        if (expectedSig !== signature) throw invalidTokenErr(`Invalid invite token`)

        if (!invite.active) {
            const err = new Error(`Invite link disabled`)
            err.userDetails = 'Kutsu linkki ei käytössä'
            err.status = 400
            throw err
        }

        if (invite.expires_at && Date.now() > new Date(invite.expires_at)) {
            const err = new Error(`Invite link expired`)
            err.userDetails = 'Kutsu linkki vanhentunut'
            err.status = 400
            throw err
        }

        return invite.teacher_id
    }
}

export default TeacherInviteService