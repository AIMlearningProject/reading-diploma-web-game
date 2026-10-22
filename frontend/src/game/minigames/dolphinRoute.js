// G7 DELFIININ REITTI — swim the fish and its rider through the gaps in the seaweed.
//
// One endless run at constant difficulty: the speed, the spacing and the gap
// never change, and there are no rounds. The only number that grows is the
// pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// The id still says dolphin because it is stored in the rewards table; the art
// has the pupil's buddy riding a fish.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it
// by a fixed step, draw() paints it. Nothing here touches the DOM.

import { loadArt } from './art.js'
import bgUrl from '../../assets/minigames/delfiinin-reitti/bg.png'
import charMattiUrl from '../../assets/minigames/delfiinin-reitti/char_matti.png'
import charPandaUrl from '../../assets/minigames/delfiinin-reitti/char_panda.png'
import charPpUrl from '../../assets/minigames/delfiinin-reitti/char_pp.png'
import fishUrl from '../../assets/minigames/delfiinin-reitti/fish.png'
import weedBottom1Url from '../../assets/minigames/delfiinin-reitti/weed_bottom_1.png'
import weedBottom2Url from '../../assets/minigames/delfiinin-reitti/weed_bottom_2.png'
import weedTop1Url from '../../assets/minigames/delfiinin-reitti/weed_top_1.png'
import weedTop2Url from '../../assets/minigames/delfiinin-reitti/weed_top_2.png'
import weedTop3Url from '../../assets/minigames/delfiinin-reitti/weed_top_3.png'

const WIDTH = 640
const HEIGHT = 400

// The art is drawn at 2x, so a picture's logical size is half its pixels, and
// every offset below is the layer's place in the 1280x800 source halved.
const art = loadArt({
    bg: bgUrl,
    charMatti: charMattiUrl,
    charPanda: charPandaUrl,
    charPp: charPpUrl,
    fish: fishUrl,
    weedBottom1: weedBottom1Url,
    weedBottom2: weedBottom2Url,
    weedTop1: weedTop1Url,
    weedTop2: weedTop2Url,
    weedTop3: weedTop3Url
})
const WATER = '#2789cd'

// Each stalk hangs from the surface or grows from the floor, its tip at the
// gap. The stems were lengthened past the stage height, so any gap fits.
const TOP_WEEDS = ['weedTop1', 'weedTop2', 'weedTop3']
const BOTTOM_WEEDS = ['weedBottom1', 'weedBottom2']

// The buddy sits on the fish's back. Offsets are from the fish's top-left corner.
const RIDERS = {
    buddy_1: { look: 'charPanda', dx: 31, dy: -68 },
    buddy_2: { look: 'charPp', dx: 28, dy: -63 },
    buddy_3: { look: 'charMatti', dx: 33, dy: -68.5 }
}

// The point the rider turns about and that state.y tracks, in the fish's own
// coordinates: the middle of fish and buddy together.
const PIVOT_X = 71
const PIVOT_Y = -6

// Circles around the fish and the buddy, from the pivot. A little inside the
// outlines, so a graze that looks like a miss is one.
const HITBOX = [
    { x: 4, y: 38, r: 18 },
    { x: 44, y: 36, r: 18 },
    { x: -1, y: -2, r: 26 },
    { x: -5, y: -36, r: 22 }
]

// Fixed for the whole run, on purpose.
const SPEED = 168          // px/s the seaweed scrolls past
const PILLAR_EVERY = 1.5   // s between pillars
const GAP = 210            // px of open water between the two tips
const GAP_DRIFT = 95       // px a gap centre may move from the one before it
const GAP_MIN = 125
const GAP_MAX = HEIGHT - 125
const GRAVITY = 950        // px/s²
const FLAP = -330          // px/s given by one tail flick
const MAX_FALL = 430       // px/s the rider never sinks faster than
const RIDER_X = 148
const PILLAR_REACH = 60    // px either side of a pillar's centre its widest stalk may reach
const BUBBLE_ALPHA = 0.44

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

const riderOf = (buddy) => RIDERS[buddy] ?? RIDERS.buddy_1

/** The opaque [left, right) of one pixel row, or null if it is empty. */
function opaqueSpan(data, width, row) {
    let left = -1
    let right = -1
    for (let x = 0; x < width; x++) {
        if (data[(row * width + x) * 4 + 3] === 0) continue
        if (left < 0) left = x
        right = x + 1
    }
    return left < 0 ? null : [left, right]
}

// Per logical row, the opaque [left, right] of a stalk, read once from its
// pixels so the seaweed collides where it is drawn, not as a rectangle.
const spans = new Map()

function spansOf(name) {
    if (spans.has(name)) return spans.get(name)
    const image = art[name]
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0)
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
    const rows = []
    for (let y = 0; y < height; y += 2) {
        const pair = [opaqueSpan(data, width, y), y + 1 < height ? opaqueSpan(data, width, y + 1) : null].filter(Boolean)
        rows.push(pair.length > 0
            ? [Math.min(...pair.map((span) => span[0])) / 2, Math.max(...pair.map((span) => span[1])) / 2]
            : null)
    }
    spans.set(name, rows)
    return rows
}

/** Where a pillar's two stalks sit: their pictures' top-left corners and sizes. */
function stalksOf(pillar) {
    const top = art[pillar.top]
    const bottom = art[pillar.bottom]
    const topW = top.naturalWidth / 2
    const topH = top.naturalHeight / 2
    const bottomW = bottom.naturalWidth / 2
    return [
        { name: pillar.top, x: pillar.x - topW / 2, y: pillar.gapY - GAP / 2 - topH, w: topW, h: topH },
        { name: pillar.bottom, x: pillar.x - bottomW / 2, y: pillar.gapY + GAP / 2, w: bottomW, h: bottom.naturalHeight / 2 }
    ]
}

function circleHitsStalk(circle, stalk) {
    if (circle.x + circle.r < stalk.x || circle.x - circle.r > stalk.x + stalk.w) return false
    const rows = spansOf(stalk.name)
    const from = Math.max(Math.floor(circle.y - circle.r - stalk.y), 0)
    const to = Math.min(Math.ceil(circle.y + circle.r - stalk.y), rows.length - 1)
    for (let row = from; row <= to; row++) {
        const span = rows[row]
        if (!span) continue
        const dy = stalk.y + row + 0.5 - circle.y
        const half = Math.sqrt(Math.max(circle.r * circle.r - dy * dy, 0))
        if (stalk.x + span[0] < circle.x + half && stalk.x + span[1] > circle.x - half) return true
    }
    return false
}

/** The hitbox circles where they are now, turned with the rider. */
function hitCircles(state) {
    const cos = Math.cos(state.tilt)
    const sin = Math.sin(state.tilt)
    return HITBOX.map(({ x, y, r }) => ({
        x: RIDER_X + x * cos - y * sin,
        y: state.y + x * sin + y * cos,
        r
    }))
}

function addPillar(state) {
    const previous = state.pillars.at(-1)
    const from = previous ? previous.gapY : HEIGHT / 2
    const drift = (Math.random() * 2 - 1) * GAP_DRIFT
    state.pillars.push({
        x: WIDTH + PILLAR_REACH,
        gapY: clamp(from + drift, GAP_MIN, GAP_MAX),
        top: pick(TOP_WEEDS),
        bottom: pick(BOTTOM_WEEDS),
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

    create({ buddy } = {}) {
        const state = {
            buddy,
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
            // Square bubbles, as in the picture.
            bubbles: Array.from({ length: 12 }, () => ({
                x: Math.random() * WIDTH,
                y: Math.random() * HEIGHT,
                size: 4.5 + Math.random() * 1.5,
                v: 12 + Math.random() * 22
            })),
            score: 0,
            dead: false
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
            if (bubble.y + bubble.size < 0) {
                bubble.y = HEIGHT
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
        // A tall rider swings its head a long way, so it tilts less than the
        // old dolphin did.
        state.tilt = clamp(state.vy / 900, -0.3, 0.45)

        state.sincePillar += dt
        if (state.sincePillar >= PILLAR_EVERY) {
            state.sincePillar -= PILLAR_EVERY
            addPillar(state)
        }

        for (const pillar of state.pillars) {
            pillar.x -= SPEED * dt
            if (!pillar.passed && pillar.x + PILLAR_REACH < RIDER_X - PIVOT_X) {
                pillar.passed = true
                state.score += 1
            }
        }
        state.pillars = state.pillars.filter((pillar) => pillar.x + PILLAR_REACH > 0)

        // Until the pictures have decoded there is nothing to collide with.
        if (!art.ready) return

        const circles = hitCircles(state)

        // Break the surface or hit the sea floor and the run is over.
        if (circles.some((c) => c.y < c.r || c.y + c.r > HEIGHT)) {
            state.dead = true
            return
        }

        for (const pillar of state.pillars) {
            const reach = PILLAR_REACH + PIVOT_X + 30
            if (pillar.x > RIDER_X + reach || pillar.x < RIDER_X - reach) continue
            const isHit = stalksOf(pillar).some((stalk) => circles.some((c) => circleHitsStalk(c, stalk)))
            if (isHit) {
                state.dead = true
                return
            }
        }
    },

    draw(ctx, state) {
        ctx.fillStyle = WATER
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        // Until the pictures have decoded the run is simply water.
        if (!art.ready) return

        ctx.drawImage(art.bg, 0, 0, WIDTH, HEIGHT)

        ctx.fillStyle = `rgba(255,255,255,${BUBBLE_ALPHA})`
        for (const bubble of state.bubbles) {
            ctx.fillRect(Math.round(bubble.x * 2) / 2, Math.round(bubble.y * 2) / 2, bubble.size, bubble.size)
        }

        for (const pillar of state.pillars) {
            for (const stalk of stalksOf(pillar)) {
                ctx.drawImage(art[stalk.name], stalk.x, stalk.y, stalk.w, stalk.h)
            }
        }

        const rider = riderOf(state.buddy)
        const body = art[rider.look]
        ctx.save()
        ctx.translate(RIDER_X, state.y)
        ctx.rotate(state.tilt)
        ctx.translate(-PIVOT_X, -PIVOT_Y)
        ctx.drawImage(art.fish, 0, 0, art.fish.naturalWidth / 2, art.fish.naturalHeight / 2)
        ctx.drawImage(body, rider.dx, rider.dy, body.naturalWidth / 2, body.naturalHeight / 2)
        ctx.restore()
    }
}

export default dolphinRoute
