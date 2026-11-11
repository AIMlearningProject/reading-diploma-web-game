// G8 JÄÄRETKI — run the glacier, jump the crevasses, duck the gusts.
//
// One endless run at constant difficulty: the running speed, the obstacle
// spacing band and the sizes never change, and there are no rounds. The only
// number that grows is the pupil's own score.
// See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

import { loadArt } from './art.js'
import bgUrl from '../../assets/minigames/jaaretki/bg.png'
import charMattiUrl from '../../assets/minigames/jaaretki/char_matti.png'
import charPandaUrl from '../../assets/minigames/jaaretki/char_panda.png'
import charPpUrl from '../../assets/minigames/jaaretki/char_pp.png'
import crevasseUrl from '../../assets/minigames/jaaretki/crevasse.png'
import gustUrl from '../../assets/minigames/jaaretki/gust.png'

const WIDTH = 640
const HEIGHT = 400

// The art is drawn at 2x, so a picture's logical size is half its pixels, and
// every position below is the layer's place in the 1280x800 source halved.
const art = loadArt({
    bg: bgUrl,
    charMatti: charMattiUrl,
    charPanda: charPandaUrl,
    charPp: charPpUrl,
    crevasse: crevasseUrl,
    gust: gustUrl
})
const SKY = '#c6d2fa'
const ICE_MARK = '#c9d4f8'

const GROUND = 319          // the top of the ice
const FEET = 331            // where the buddies stand, a little into the snow

// Fixed for the whole run, on purpose.
const SPEED = 220           // px/s the glacier scrolls past
const GAP_MIN = 1.15        // s between obstacles, low end
const GAP_MAX = 1.6         // s between obstacles, high end
const GRAVITY = 1500        // px/s²
// One jump: 0.9 s in the air, 154 px up. The crevasse is wide, so this is what
// leaves about half a second in which a press still clears it.
const JUMP = -680           // px/s given by one jump
const RUNNER_CX = 118       // the runner's centre across the stage
const RUNNER_W = 44         // the body that collides, narrower than the picture
const DUCK = 0.58           // how tall a ducking buddy stays
const HAIR = 8              // px of hair on top that a gust may brush
const LOW_HALF = 0.5        // a touch or click below this share of the stage ducks

const CREVASSE_HOLE = [12, 98]   // the part of the crevasse picture you fall into
// The cloud is drawn smaller than the art, hanging from the same bottom edge so
// it still blows at head height. Its body, without the loose snowflakes, is
// measured on the art and scaled with it.
const GUST_SCALE = 0.8
const GUST_BOTTOM = 230
const GUST_H = 106 * GUST_SCALE
const GUST_Y = GUST_BOTTOM - GUST_H
const GUST_BODY_X = [22 * GUST_SCALE, 148 * GUST_SCALE]
const GUST_BODY_Y = [GUST_Y + 16 * GUST_SCALE, GUST_Y + 96 * GUST_SCALE]

// The buddy runs: same picture for everyone, only the height differs.
const RUNNERS = {
    buddy_1: 'charPanda',
    buddy_2: 'charPp',
    buddy_3: 'charMatti'
}
const lookOf = (buddy) => RUNNERS[buddy] ?? RUNNERS.buddy_1

/** The runner's height on screen, standing or ducking. */
function runnerHeight(state) {
    const image = art[lookOf(state.buddy)]
    const standing = art.ready ? image.naturalHeight / 2 : 150
    return state.isDucking ? standing * DUCK : standing
}

function addObstacle(state) {
    // Alternating is predictable and gusts alone are unreadable, so the kind is
    // drawn at random — but a gust never follows a gust straight away, which is
    // the pair a ducking pupil cannot recover from.
    const previous = state.obstacles.at(-1)
    const canGust = !previous || previous.kind !== 'gust'
    const kind = canGust && Math.random() < 0.42 ? 'gust' : 'crevasse'
    state.obstacles.push({ kind, x: WIDTH + 20 })
}

const iceExpedition = {
    id: 'jaaretki',
    width: WIDTH,
    height: HEIGHT,
    unit: 'metriä',
    // Finnish, pupil-facing.
    hint: 'Hyppy: näppäin tai napautus yläosaan. Kyykky: nuoli alas tai paina alaosaa.',

    create: ({ buddy } = {}) => ({
        buddy,
        y: FEET,              // the runner's feet
        vy: 0,
        isDucking: false,
        isAirborne: false,
        obstacles: [],
        nextIn: 1.6,
        stride: 0,
        scroll: 0,
        distance: 0,
        score: 0,
        dead: false,
        awake: false
    }),

    update(state, dt, input) {
        if (state.dead) return

        // With a mouse or a finger, the upper half of the stage jumps and holding
        // the lower half ducks, as the up and down keys do.
        const isPointerLow = input.pointerY !== null && input.pointerY >= LOW_HALF
        const wantsJump = input.justPressed && !isPointerLow
        const wantsDuck = input.down || (input.pressed && isPointerLow)

        // The run waits until the first press, so nothing is lost while the
        // pupil gets ready.
        if (!state.awake) {
            if (!input.justPressed) return
            state.awake = true
        }

        if (wantsJump && !state.isAirborne) {
            state.vy = JUMP
            state.isAirborne = true
        }
        // Ducking in mid-air would be a second, hidden mechanic; keep it on the
        // ground where the pupil can see what it does.
        state.isDucking = wantsDuck && !state.isAirborne

        if (state.isAirborne) {
            state.vy += GRAVITY * dt
            state.y += state.vy * dt
            if (state.y >= FEET) {
                state.y = FEET
                state.vy = 0
                state.isAirborne = false
            }
        }

        state.scroll = (state.scroll + SPEED * dt) % 64
        state.stride += dt * (state.isAirborne ? 0 : 9)
        state.distance += SPEED * dt
        state.score = Math.floor(state.distance / 10)

        state.nextIn -= dt
        if (state.nextIn <= 0) {
            state.nextIn = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)
            addObstacle(state)
        }

        for (const obstacle of state.obstacles) obstacle.x -= SPEED * dt
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + 200 > 0)

        const top = state.y - runnerHeight(state) + HAIR
        const left = RUNNER_CX - RUNNER_W / 2
        const right = RUNNER_CX + RUNNER_W / 2

        for (const obstacle of state.obstacles) {
            if (obstacle.kind === 'crevasse') {
                // Only the ice carries you: over the hole, you are in it.
                const holeLeft = obstacle.x + CREVASSE_HOLE[0]
                const holeRight = obstacle.x + CREVASSE_HOLE[1]
                const isOverHole = right > holeLeft && left < holeRight
                if (isOverHole && state.y >= FEET) {
                    state.dead = true
                    return
                }
            } else {
                const isWithinX = right > obstacle.x + GUST_BODY_X[0] && left < obstacle.x + GUST_BODY_X[1]
                const isWithinY = top < GUST_BODY_Y[1] && state.y > GUST_BODY_Y[0]
                if (isWithinX && isWithinY) {
                    state.dead = true
                    return
                }
            }
        }
    },

    draw(ctx, state) {
        ctx.fillStyle = SKY
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        // Until the pictures have decoded the run is simply sky.
        if (!art.ready) return

        ctx.drawImage(art.bg, 0, 0, WIDTH, HEIGHT)

        // Short marks on the ice, so the ground is seen to move.
        ctx.strokeStyle = ICE_MARK
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath()
        for (let x = -state.scroll; x < WIDTH; x += 64) {
            ctx.moveTo(x, GROUND + 30)
            ctx.lineTo(x + 22, GROUND + 30)
            ctx.moveTo(x + 32, GROUND + 58)
            ctx.lineTo(x + 46, GROUND + 58)
        }
        ctx.stroke()

        for (const obstacle of state.obstacles) {
            if (obstacle.kind === 'crevasse') {
                const image = art.crevasse
                ctx.drawImage(image, obstacle.x, GROUND, image.naturalWidth / 2, image.naturalHeight / 2)
            }
        }

        // The buddy, bobbing as it runs and squashed down when it ducks.
        const image = art[lookOf(state.buddy)]
        const w = image.naturalWidth / 2
        const h = image.naturalHeight / 2
        const bob = state.isAirborne ? 0 : Math.abs(Math.sin(state.stride)) * 4
        const tilt = state.isAirborne ? -0.08 : Math.sin(state.stride * 2) * 0.04
        ctx.save()
        ctx.translate(RUNNER_CX, state.y - bob)
        ctx.rotate(tilt)
        if (state.isDucking) ctx.scale(1.12, DUCK)
        ctx.drawImage(image, -w / 2, -h, w, h)
        ctx.restore()

        // Gusts blow in front of the buddy.
        for (const obstacle of state.obstacles) {
            if (obstacle.kind === 'gust') {
                const cloud = art.gust
                const w = (cloud.naturalWidth / 2) * GUST_SCALE
                ctx.drawImage(cloud, obstacle.x, GUST_Y, w, GUST_H)
            }
        }
    }
}

export default iceExpedition
