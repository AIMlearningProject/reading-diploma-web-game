// G5 KOSKIMELONTA — paddle the rapids, dodge the rocks.
//
// One endless run at constant difficulty: the current, the spacing and the lane
// width never change, and there are no rounds. The only number that grows is the
// pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

import { drawMirrored, loadArt } from './art.js'
import banksUrl from '../../assets/minigames/koskimelonta/banks.png'
import canoeUrl from '../../assets/minigames/koskimelonta/canoe.png'
import hazeUrl from '../../assets/minigames/koskimelonta/haze.png'
import rock1Url from '../../assets/minigames/koskimelonta/rock_1.png'
import rock2Url from '../../assets/minigames/koskimelonta/rock_2.png'
import rock3Url from '../../assets/minigames/koskimelonta/rock_3.png'
import streaksUrl from '../../assets/minigames/koskimelonta/streaks.png'

const WIDTH = 640
const HEIGHT = 400

// The art is drawn at 2x. Streaks and banks scroll; the water colour and the
// haze (the deep-to-shallow gradient) stay put.
const art = loadArt({
    banks: banksUrl,
    canoe: canoeUrl,
    haze: hazeUrl,
    rock1: rock1Url,
    rock2: rock2Url,
    rock3: rock3Url,
    streaks: streaksUrl
})
const WATER = '#3e80a4'
// How often each rock picture turns up. Rock 2 is meant to be the rare one.
const ROCK_WEIGHTS = { rock1: 4, rock2: 2, rock3: 4 }
const ROCK_WEIGHT_TOTAL = Object.values(ROCK_WEIGHTS).reduce((sum, weight) => sum + weight, 0)

function pickRockLook() {
    let roll = Math.random() * ROCK_WEIGHT_TOTAL
    for (const [look, weight] of Object.entries(ROCK_WEIGHTS)) {
        roll -= weight
        if (roll < 0) return look
    }
    return 'rock1'
}

const SCROLL_PERIOD = HEIGHT * 2 // mirrored scrolling repeats every two copies

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

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

/** Whether a canoe at `x` is touching any of this row's rocks. */
function hitsRock(x, row) {
    const blocked = LANES.filter((_, index) => !row.open.includes(index))
    return blocked.some((lane) => Math.abs(x - lane) < ROCK_R * 0.6 + CANOE_W * 0.35)
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

    // Which rock picture each lane gets, fixed here so it does not change as the row scrolls.
    const looks = LANES.map(() => pickRockLook())
    state.rows.push({ y: -ROCK_R, open, passed: false, looks })
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

        state.scroll = (state.scroll + SPEED * dt) % SCROLL_PERIOD
        state.distance += SPEED * dt
        state.score = Math.floor(state.distance / 10)

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
        ctx.fillStyle = WATER
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        // Until the pictures have decoded the run is simply a stretch of water.
        if (!art.ready) return

        drawMirrored(ctx, art.streaks, state.scroll, WIDTH, HEIGHT)
        ctx.drawImage(art.haze, 0, 0, WIDTH, HEIGHT)
        drawMirrored(ctx, art.banks, state.scroll, WIDTH, HEIGHT)

        // The art is drawn at 2x, so a picture's logical size is half its pixels.
        const rockSize = ROCK_R * 2
        for (const row of state.rows) {
            LANES.forEach((lane, index) => {
                if (row.open.includes(index)) return
                ctx.drawImage(art[row.looks[index]], lane - ROCK_R, row.y - ROCK_R, rockSize, rockSize)
            })
        }

        // The canoe, seen from above, paddles included; the picture is centred on the hull.
        const canoeW = art.canoe.naturalWidth / 2
        const canoeH = art.canoe.naturalHeight / 2
        ctx.drawImage(art.canoe, state.x - canoeW / 2, CANOE_Y - canoeH / 2, canoeW, canoeH)
    }
}

export default rapids
