// G5 KOSKIMELONTA — paddle the rapids, dodge the rocks.
//
// One endless run at constant difficulty: the current, the spacing and the lane
// width never change, and there are no rounds. The only number that grows is the
// pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

const WIDTH = 640
const HEIGHT = 400

// Fixed for the whole run, on purpose.
const SPEED = 180         // px/s the river scrolls past
const ROW_EVERY = 0.9     // s between rows of rocks
const LANES = [146, 320, 494]
const CANOE_Y = 326
const CANOE_W = 54
const CANOE_H = 74
const ROCK_R = 40
const SWITCH_TIME = 0.12  // s the canoe takes to slide between lanes
const REPEAT_AFTER = 0.22 // s a held arrow waits before it moves another lane

const UNIT_CIRCLE = new Path2D('M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z')

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

/** Whether a canoe at `x` is touching any of this row's rocks. */
function hitsRock(x, row) {
    const blocked = LANES.filter((_, index) => !row.open.includes(index))
    return blocked.some((lane) => Math.abs(x - lane) < ROCK_R * 0.6 + CANOE_W * 0.35)
}

function disc(ctx, x, y, radius) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(radius, radius)
    // eslint-disable-next-line unicorn/no-array-fill-with-reference-type -- CanvasRenderingContext2D#fill, not Array#fill
    ctx.fill(UNIT_CIRCLE)
    ctx.restore()
}

/**
 * Rows are generated fair by construction, never merely random: a row leaves
 * one or two lanes open, and at least one of them is reachable from a lane that
 * was open in the row before, so there is always a line through.
 */
function addRow(state) {
    const previousOpen = state.rows.at(-1)?.open ?? [0, 1, 2]
    const reachable = new Set()
    for (const lane of previousOpen) {
        if (lane > 0) reachable.add(lane - 1)
        reachable.add(lane)
        if (lane < 2) reachable.add(lane + 1)
    }

    const blockedCount = Math.random() < 0.45 ? 2 : 1
    let open = []
    // Try until the row leaves something reachable open. With three lanes this
    // lands on the first or second attempt, but the loop is the guarantee.
    for (let attempt = 0; attempt < 12 && open.length === 0; attempt++) {
        const lanes = [0, 1, 2].toSorted(() => Math.random() - 0.5)
        const blocked = new Set(lanes.slice(0, blockedCount))
        const candidate = [0, 1, 2].filter((lane) => !blocked.has(lane))
        if (candidate.some((lane) => reachable.has(lane))) open = candidate
    }
    if (open.length === 0) open = [...previousOpen]

    state.rows.push({ y: -ROCK_R, open, passed: false })
}

const rapids = {
    id: 'koskimelonta',
    width: WIDTH,
    height: HEIGHT,
    unit: 'metriä',
    // Finnish, pupil-facing.
    hint: 'Nuolet tai napautus vasemmalle ja oikealle.',

    create: () => ({
            lane: 1,
            x: LANES[1],
            fromX: LANES[1],
            switching: 0,
            wasLeft: false,
            wasRight: false,
            heldFor: 0,
            rows: [],
            sinceRow: 0,
            foam: Array.from({ length: 26 }, () => ({
                x: Math.random() * WIDTH,
                y: Math.random() * HEIGHT,
                r: 2 + Math.random() * 4
            })),
            scroll: 0,
            distance: 0,
            score: 0,
            dead: false,
            awake: false
        }),

    update(state, dt, input) {
        if (state.dead) return

        // A press of any kind starts the run, so the pupil can look first.
        if (!state.awake) {
            if (!input.justPressed && !input.left && !input.right) return
            state.awake = true
        }

        // One press moves one lane, so the lanes stay discrete. Holding the
        // arrow repeats slowly rather than doing nothing: a pupil who holds it
        // down expects to keep moving, and nothing is gained by refusing.
        let step = 0
        const isHeld = input.left || input.right
        const direction = input.left ? -1 : 1
        if (input.left !== state.wasLeft || input.right !== state.wasRight) state.heldFor = 0
        if (isHeld) {
            if (state.heldFor === 0) step = direction
            else if (state.heldFor >= REPEAT_AFTER) {
                step = direction
                state.heldFor -= REPEAT_AFTER
            }
            state.heldFor += dt
        } else {
            state.heldFor = 0
        }
        state.wasLeft = input.left
        state.wasRight = input.right

        // On a touch screen the side of the stage that was tapped steers.
        if (input.justPressed && input.pointerX !== null) {
            step += input.pointerX < 0.5 ? -1 : 1
        }

        if (step !== 0) {
            const next = clamp(state.lane + step, 0, LANES.length - 1)
            if (next !== state.lane) {
                state.fromX = state.x
                state.lane = next
                state.switching = SWITCH_TIME
            }
        }

        if (state.switching > 0) {
            state.switching = Math.max(0, state.switching - dt)
            const t = 1 - state.switching / SWITCH_TIME
            state.x = state.fromX + (LANES[state.lane] - state.fromX) * t
        } else {
            state.x = LANES[state.lane]
        }

        state.scroll = (state.scroll + SPEED * dt) % 70
        state.distance += SPEED * dt
        state.score = Math.floor(state.distance / 10)

        for (const fleck of state.foam) {
            fleck.y += SPEED * 0.85 * dt
            if (fleck.y - fleck.r > HEIGHT) {
                fleck.y = -fleck.r
                fleck.x = Math.random() * WIDTH
            }
        }

        state.sinceRow += dt
        if (state.sinceRow >= ROW_EVERY) {
            state.sinceRow -= ROW_EVERY
            addRow(state)
        }

        for (const row of state.rows) row.y += SPEED * dt
        state.rows = state.rows.filter((row) => row.y - ROCK_R < HEIGHT + 40)

        // Collision is tested against where the canoe actually is, not which
        // lane it belongs to: mid-switch it is between two lanes, and what the
        // pupil sees clearing the rock has to be what clears the rock.
        for (const row of state.rows) {
            if (Math.abs(row.y - CANOE_Y) > ROCK_R * 0.6 + CANOE_H * 0.35) continue
            if (hitsRock(state.x, row)) {
                state.dead = true
                return
            }
        }
    },

    draw(ctx, state) {
        const water = ctx.createLinearGradient(0, 0, 0, HEIGHT)
        water.addColorStop(0, '#2f6e8f')
        water.addColorStop(1, '#4a90b8')
        ctx.fillStyle = water
        ctx.fillRect(0, 0, WIDTH, HEIGHT)

        // Banks, so the three lanes read as a channel rather than open water.
        ctx.fillStyle = '#3f6b4a'
        ctx.fillRect(0, 0, 60, HEIGHT)
        ctx.fillRect(WIDTH - 60, 0, 60, HEIGHT)
        ctx.fillStyle = '#5b7f4b'
        ctx.fillRect(0, 0, 44, HEIGHT)
        ctx.fillRect(WIDTH - 44, 0, 44, HEIGHT)

        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let y = -state.scroll; y < HEIGHT; y += 70) {
            ctx.moveTo(96, y)
            ctx.lineTo(96, y + 34)
            ctx.moveTo(WIDTH - 96, y)
            ctx.lineTo(WIDTH - 96, y + 34)
        }
        ctx.stroke()

        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        for (const fleck of state.foam) disc(ctx, fleck.x, fleck.y, fleck.r)

        for (const row of state.rows) {
            const blocked = LANES.filter((_, index) => !row.open.includes(index))
            for (const lane of blocked) {
                ctx.fillStyle = '#6b6257'
                disc(ctx, lane, row.y, ROCK_R)
                ctx.fillStyle = '#8a8075'
                disc(ctx, lane - 9, row.y - 9, ROCK_R * 0.45)
                ctx.fillStyle = 'rgba(255,255,255,0.45)'
                disc(ctx, lane, row.y + ROCK_R * 0.85, ROCK_R * 0.5)
            }
        }

        // The canoe, seen from above.
        ctx.save()
        ctx.translate(state.x, CANOE_Y)
        ctx.fillStyle = '#b07a3e'
        ctx.strokeStyle = '#4a3520'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(0, 0, CANOE_W / 2, CANOE_H / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#8a5a36'
        ctx.beginPath()
        ctx.ellipse(0, 0, CANOE_W / 2 - 9, CANOE_H / 2 - 11, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1e3a5f'
        disc(ctx, 0, -4, 11)
        ctx.strokeStyle = '#4a3520'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(-26, -2)
        ctx.lineTo(26, 6)
        ctx.stroke()
        ctx.restore()
    }
}

export default rapids
