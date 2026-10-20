// G8 JÄÄRETKI — run the glacier, jump the crevasses, duck the gusts.
//
// One endless run at constant difficulty: the running speed, the obstacle
// spacing band and the sizes never change, and there are no rounds. The only
// number that grows is the pupil's own score.
// See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

const WIDTH = 640
const HEIGHT = 400
const GROUND = 318

// Fixed for the whole run, on purpose.
const SPEED = 220           // px/s the glacier scrolls past
const GAP_MIN = 1.15        // s between obstacles, low end
const GAP_MAX = 1.6         // s between obstacles, high end
const GRAVITY = 1900        // px/s²
const JUMP = -620           // px/s given by one jump
const RUNNER_X = 112
const RUNNER_W = 28
const STAND_H = 48
const DUCK_H = 28

const CREVASSE_W = 40       // a hole in the ice: jump it
const GUST_TOP = 248        // a gust blows across at head height: duck under it
const GUST_BOTTOM = 288
const GUST_W = 74

// Shapes that never change are built once from path data and reused.
const UNIT_CIRCLE = new Path2D('M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z')
// A peak drawn in a unit box, scaled to each mountain's width and height.
const UNIT_PEAK = new Path2D('M0 0L0.5 -1L1 0Z')

function addObstacle(state) {
    // Alternating is predictable and gusts alone are unreadable, so the kind is
    // drawn at random — but a gust never follows a gust straight away, which is
    // the pair a ducking pupil cannot recover from.
    const previous = state.obstacles.at(-1)
    const canGust = !previous || previous.kind !== 'gust'
    const kind = canGust && Math.random() < 0.42 ? 'gust' : 'crevasse'
    state.obstacles.push({ kind, x: WIDTH + 40 })
}

function disc(ctx, x, y, radius) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(radius, radius)
    // eslint-disable-next-line unicorn/no-array-fill-with-reference-type -- CanvasRenderingContext2D#fill, not Array#fill
    ctx.fill(UNIT_CIRCLE)
    ctx.restore()
}

const iceExpedition = {
    id: 'jaaretki',
    width: WIDTH,
    height: HEIGHT,
    unit: 'metriä',
    // Finnish, pupil-facing.
    hint: 'Näppäin tai napautus = hyppy. Nuoli alas = kyykky.',

    create() {
        const state = {
            y: GROUND,            // the runner's feet
            vy: 0,
            isDucking: false,
            isAirborne: false,
            obstacles: [],
            nextIn: 1.6,
            peaks: Array.from({ length: 9 }, (_, i) => ({
                x: i * 90,
                h: 40 + Math.random() * 54
            })),
            stride: 0,
            scroll: 0,
            distance: 0,
            score: 0,
            dead: false,
            awake: false
        }
        return state
    },

    update(state, dt, input) {
        if (state.dead) return

        // The run waits until the first jump, so nothing is lost while the
        // pupil gets ready.
        if (!state.awake) {
            if (!input.justPressed) return
            state.awake = true
        }

        if (input.justPressed && !state.isAirborne) {
            state.vy = JUMP
            state.isAirborne = true
        }
        // Ducking in mid-air would be a second, hidden mechanic; keep it on the
        // ground where the pupil can see what it does.
        state.isDucking = input.down && !state.isAirborne

        if (state.isAirborne) {
            state.vy += GRAVITY * dt
            state.y += state.vy * dt
            if (state.y >= GROUND) {
                state.y = GROUND
                state.vy = 0
                state.isAirborne = false
            }
        }

        state.scroll = (state.scroll + SPEED * dt) % 64
        state.stride += dt * (state.isAirborne ? 0 : 9)
        state.distance += SPEED * dt
        state.score = Math.floor(state.distance / 10)

        for (const peak of state.peaks) {
            peak.x -= SPEED * 0.25 * dt
            if (peak.x + 90 < 0) {
                peak.x += 9 * 90
                peak.h = 40 + Math.random() * 54
            }
        }

        state.nextIn -= dt
        if (state.nextIn <= 0) {
            state.nextIn = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)
            addObstacle(state)
        }

        for (const obstacle of state.obstacles) obstacle.x -= SPEED * dt
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + 120 > 0)

        const height = state.isDucking ? DUCK_H : STAND_H
        const top = state.y - height
        const left = RUNNER_X
        const right = RUNNER_X + RUNNER_W

        for (const obstacle of state.obstacles) {
            if (obstacle.kind === 'crevasse') {
                // Only the ice carries you: over the hole, you are in it.
                const isOverHole = right > obstacle.x && left < obstacle.x + CREVASSE_W
                if (isOverHole && state.y >= GROUND) {
                    state.dead = true
                    return
                }
            } else {
                const isWithinX = right > obstacle.x && left < obstacle.x + GUST_W
                if (isWithinX && top < GUST_BOTTOM && state.y > GUST_TOP) {
                    state.dead = true
                    return
                }
            }
        }
    },

    draw(ctx, state) {
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
        sky.addColorStop(0, '#9fc4e4')
        sky.addColorStop(1, '#dfeaf4')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, WIDTH, HEIGHT)

        ctx.fillStyle = '#eef5fb'
        for (const peak of state.peaks) {
            ctx.save()
            ctx.translate(peak.x - 10, GROUND)
            ctx.scale(110, peak.h)
            // eslint-disable-next-line unicorn/no-array-fill-with-reference-type -- CanvasRenderingContext2D#fill, not Array#fill
            ctx.fill(UNIT_PEAK)
            ctx.restore()
        }

        // The ice, with the crevasses cut out of it.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND)
        ctx.strokeStyle = '#c9dcec'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let x = -state.scroll; x < WIDTH; x += 64) {
            ctx.moveTo(x, GROUND + 18)
            ctx.lineTo(x + 34, GROUND + 18)
        }
        ctx.stroke()

        for (const obstacle of state.obstacles) {
            if (obstacle.kind === 'crevasse') {
                const hole = ctx.createLinearGradient(0, GROUND, 0, HEIGHT)
                hole.addColorStop(0, '#5c93b8')
                hole.addColorStop(1, '#0c3149')
                ctx.fillStyle = hole
                ctx.fillRect(obstacle.x, GROUND, CREVASSE_W, HEIGHT - GROUND)
                // The lip of the hole, as a rect rather than a stroked path:
                // the same two points every frame are not worth a new path.
                ctx.fillStyle = '#9fc4e4'
                ctx.fillRect(obstacle.x, GROUND - 2, CREVASSE_W, 4)
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.95)'
                ctx.lineWidth = 5
                ctx.lineCap = 'round'
                ctx.beginPath()
                for (let i = 0; i < 3; i++) {
                    const y = GUST_TOP + 8 + i * 14
                    ctx.moveTo(obstacle.x, y)
                    ctx.quadraticCurveTo(obstacle.x + GUST_W / 2, y - 9, obstacle.x + GUST_W, y)
                }
                ctx.stroke()
                ctx.strokeStyle = 'rgba(159,196,228,0.85)'
                ctx.lineWidth = 3
                ctx.beginPath()
                for (let i = 0; i < 3; i++) {
                    const y = GUST_TOP + 14 + i * 14
                    ctx.moveTo(obstacle.x + 12, y)
                    ctx.quadraticCurveTo(obstacle.x + GUST_W / 2, y - 7, obstacle.x + GUST_W - 10, y)
                }
                ctx.stroke()
            }
        }

        // The runner: a bundled-up walker, red hood so it reads against the ice.
        const height = state.isDucking ? DUCK_H : STAND_H
        const top = state.y - height
        ctx.fillStyle = '#b8402f'
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(RUNNER_X, top, RUNNER_W, height, 8)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#f0dfc0'
        disc(ctx, RUNNER_X + RUNNER_W / 2 + (state.isDucking ? 4 : 0), top + 10, 8)

        if (!state.isAirborne) {
            const swing = Math.sin(state.stride * 2) * 8
            ctx.strokeStyle = '#1e3a5f'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.moveTo(RUNNER_X + 9, state.y)
            ctx.lineTo(RUNNER_X + 9 - swing, state.y + 8)
            ctx.moveTo(RUNNER_X + 19, state.y)
            ctx.lineTo(RUNNER_X + 19 + swing, state.y + 8)
            ctx.stroke()
        }
    }
}

export default iceExpedition
