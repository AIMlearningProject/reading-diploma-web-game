// G7 DELFIININ REITTI — swim the dolphin through the gaps in the reef.
//
// One endless run at constant difficulty: the speed, the spacing and the gap
// never change, and there are no rounds. The only number that grows is the
// pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it
// by a fixed step, draw() paints it. Nothing here touches the DOM.

const WIDTH = 640
const HEIGHT = 400

// Fixed for the whole run, on purpose.
const SPEED = 168          // px/s the reef scrolls past
const PILLAR_EVERY = 1.5   // s between pillars
const GAP = 158            // px of open water through each pillar
const GAP_DRIFT = 95       // px a gap centre may move from the one before it
const GAP_MIN = 110
const GAP_MAX = HEIGHT - 110
const GRAVITY = 950        // px/s²
const FLAP = -330          // px/s given by one tail flick
const MAX_FALL = 430       // px/s the dolphin never sinks faster than
const PILLAR_W = 62
const DOLPHIN_X = 148
const DOLPHIN_R = 20

// Shapes that never change are built once from path data and reused, rather
// than rebuilt sixty times a second.
const UNIT_CIRCLE = new Path2D('M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z')

const DOLPHIN_PARTS = [
    // body
    new Path2D('M-26 0Q-8 -20 20 -8Q30 -3 30 2Q14 16 -10 12Q-22 9 -26 0Z'),
    // tail
    new Path2D('M-24 -2L-38 -14L-36 6Z'),
    // dorsal fin
    new Path2D('M-2 -13L4 -26L12 -11Z')
]

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

function disc(ctx, x, y, radius) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(radius, radius)
    // eslint-disable-next-line unicorn/no-array-fill-with-reference-type -- CanvasRenderingContext2D#fill, not Array#fill
    ctx.fill(UNIT_CIRCLE)
    ctx.restore()
}

function addPillar(state) {
    const previous = state.pillars.at(-1)
    const from = previous ? previous.gapY : HEIGHT / 2
    const drift = (Math.random() * 2 - 1) * GAP_DRIFT
    state.pillars.push({
        x: WIDTH + PILLAR_W,
        gapY: clamp(from + drift, GAP_MIN, GAP_MAX),
        passed: false
    })
}

const dolphinRoute = {
    id: 'delfiinin-reitti',
    width: WIDTH,
    height: HEIGHT,
    unit: 'porttia',
    // Finnish, pupil-facing.
    hint: 'Näppäin tai napautus = hännänisku.',

    create() {
        const state = {
            y: HEIGHT / 2,
            vy: 0,
            // The run waits, hovering, until the first tail flick. Nothing is
            // lost by thinking for a moment before starting.
            awake: false,
            tilt: 0,
            pillars: [],
            // create() places the first pillar, so the timer starts from zero;
            // seeding it at PILLAR_EVERY stacked a second pillar on the first
            // one and made an impassable wall.
            sincePillar: 0,
            bubbles: Array.from({ length: 18 }, () => ({
                x: Math.random() * WIDTH,
                y: Math.random() * HEIGHT,
                r: 1.5 + Math.random() * 2.5,
                v: 12 + Math.random() * 22
            })),
            score: 0,
            dead: false,
            scroll: 0
        }
        addPillar(state)
        return state
    },

    update(state, dt, input) {
        if (state.dead) return

        // Bubbles drift whether or not the run has started, so the water is
        // alive while the pupil gets ready.
        for (const bubble of state.bubbles) {
            bubble.y -= bubble.v * dt
            if (bubble.y + 4 < 0) {
                bubble.y = HEIGHT + 4
                bubble.x = Math.random() * WIDTH
            }
        }

        if (!state.awake) {
            if (!input.justPressed) return
            state.awake = true
        }

        if (input.justPressed) state.vy = FLAP

        state.vy = Math.min(state.vy + GRAVITY * dt, MAX_FALL)
        state.y += state.vy * dt
        state.tilt = clamp(state.vy / 900, -0.5, 0.75)
        state.scroll = (state.scroll + SPEED * dt) % 80

        state.sincePillar += dt
        if (state.sincePillar >= PILLAR_EVERY) {
            state.sincePillar -= PILLAR_EVERY
            addPillar(state)
        }

        for (const pillar of state.pillars) {
            pillar.x -= SPEED * dt
            if (!pillar.passed && pillar.x + PILLAR_W + DOLPHIN_R < DOLPHIN_X) {
                pillar.passed = true
                state.score += 1
            }
        }
        state.pillars = state.pillars.filter((pillar) => pillar.x + PILLAR_W * 2 > 0)

        // Break the surface or hit the sea floor and the run is over.
        if (state.y < DOLPHIN_R || state.y + DOLPHIN_R > HEIGHT) {
            state.dead = true
            return
        }

        for (const pillar of state.pillars) {
            const isWithinX = DOLPHIN_X + DOLPHIN_R > pillar.x
                && DOLPHIN_X < pillar.x + PILLAR_W + DOLPHIN_R
            if (!isWithinX) continue
            const isAboveGap = state.y + GAP / 2 < pillar.gapY + DOLPHIN_R
            const isBelowGap = state.y > pillar.gapY + GAP / 2 - DOLPHIN_R
            if (isAboveGap || isBelowGap) {
                state.dead = true
                return
            }
        }
    },

    draw(ctx, state) {
        const water = ctx.createLinearGradient(0, 0, 0, HEIGHT)
        water.addColorStop(0, '#1b6288')
        water.addColorStop(1, '#0c3149')
        ctx.fillStyle = water
        ctx.fillRect(0, 0, WIDTH, HEIGHT)

        ctx.fillStyle = 'rgba(255,255,255,0.14)'
        for (const bubble of state.bubbles) {
            disc(ctx, bubble.x, bubble.y, bubble.r)
        }

        // The sunlit surface, scrolling with the reef so the speed reads.
        ctx.strokeStyle = 'rgba(255,233,168,0.25)'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let x = -state.scroll; x < WIDTH; x += 80) {
            ctx.moveTo(x, 10)
            ctx.quadraticCurveTo(x + 20, 2, x + 40, 10)
        }
        ctx.stroke()

        for (const pillar of state.pillars) {
            const top = pillar.gapY - GAP / 2
            const bottom = pillar.gapY + GAP / 2

            ctx.fillStyle = '#2f7188'
            ctx.strokeStyle = '#1d4f61'
            ctx.lineWidth = 4
            ctx.fillRect(pillar.x, 0, PILLAR_W, top)
            ctx.strokeRect(pillar.x, -4, PILLAR_W, top + 4)
            ctx.fillRect(pillar.x, bottom, PILLAR_W, HEIGHT - bottom)
            ctx.strokeRect(pillar.x, bottom, PILLAR_W, HEIGHT - bottom + 4)

            ctx.fillStyle = '#3f8ea3'
            disc(ctx, pillar.x + PILLAR_W / 2, top - 8, 13)
            disc(ctx, pillar.x + PILLAR_W / 2, bottom + 8, 13)
        }

        ctx.save()
        ctx.translate(DOLPHIN_X, state.y)
        ctx.rotate(state.tilt)
        ctx.fillStyle = '#cfe3ee'
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 3
        for (const part of DOLPHIN_PARTS) {
            ctx.fill(part)
            ctx.stroke(part)
        }
        ctx.fillStyle = '#1e3a5f'
        disc(ctx, 18, -4, 2.6)
        ctx.restore()
    }
}

export default dolphinRoute
