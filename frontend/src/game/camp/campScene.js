// The buddy's camp on the pupil's dashboard: a preview of the planned pet.
//
// A plain module like the mini-games: create() makes the state, update() moves
// it on by dt seconds, draw() paints it, tap() answers a click. It draws on a
// 1038 x 700 stage, the size of the camp's Aseprite file; the host scales it.
//
// The scene art comes from build/camp/split_camp.py, which also writes
// layout.json, where every layer sits on the stage. Draw order follows the
// Aseprite layers: sky, clouds or moon, land, tent, (sleeper), tent outline,
// buddy, firewood, flame, plants. The plants come last because they stand in
// front of everything. At night the fire's light goes in between: a pool on
// the ground over the land, a halo behind the flame, and a warm cast on the
// buddy, swelling and shrinking slowly as if the fire breathed.
//
// The host decides the phase ('day', 'evening' or 'bed', see schedule.js) and
// passes it to create() and update(), so it can follow the clock or a switch.

import { loadArt } from '../minigames/art.js'
import layout from '../../assets/camp/scene/layout.json'
import {
    BOOK_TURN_FRAMES, BUDDY_LOOKS, buddyArt, closedEyesOf, surprisedEyesOf
} from './buddies.js'

export const STAGE_W = layout.stage.w
export const STAGE_H = layout.stage.h

const files = import.meta.glob('../../assets/camp/scene/*/*.png', { eager: true, import: 'default' })
const art = loadArt(Object.fromEntries(
    Object.entries(files).map(([path, url]) => [path.match(/scene\/(.+)\.png$/)[1], url])
))

// Where the buddy sits, feet on the stage; facing 1 is right, -1 left.
const SEA_SPOT = { x: 740, y: 562, facing: 1 }
const READ_SPOT = { x: 480, y: 556, facing: 1 }
const FIRE_SPOT = { x: 690, y: 616, facing: -1 }
// The open sand a stroll may cross: between the tent and the right bushes,
// behind the firewood.
const STROLL = { left: 460, right: 780, top: 530, bottom: 562 }

const WALK_SPEED = 85        // stage px a second
const STEPS_PER_SECOND = 3.2
const STEP_LIFT = 6          // how high a step bobs
const BREATH_PERIOD = 3.2    // seconds
const BREATH = 0.018         // the chest swells by this share of the height
const BLINK_TIME = 0.14
const HOP_TIME = 0.46
const HOP_HEIGHT = 38
const SETTLE_TIME = 0.22     // the little squash when the buddy changes pose
const FIRE_FRAME_TIME = 0.1  // the Aseprite file's frame duration
const SLEEP_PERIOD = 3.8
const SLEEP_BREATH = 0.03
const SURPRISE_TIME = 0.7    // how long the eyes stay big after a tap
const TURN_TIME = 0.45       // one page turn, three frames

// The fire's light, in stage pixels: where it comes from and how far it reaches.
const FIRE_BASE = { x: 529, y: 632 }
const FLAME = { x: 530, y: 520 }
const GROUND_LIGHT = 380
const HALO = 165
const BUDDY_LIGHT = 330
// The light swells and shrinks slowly, two waves of different lengths so it
// never settles into a beat. Tied to the flame's 0.1 s frames it jumped too often.
const glowBreath = (time) => 1 + 0.025 * Math.sin((time * 2 * Math.PI) / 2.8)
    + 0.012 * Math.sin((time * 2 * Math.PI) / 1.9)

const random = (low, high) => low + Math.random() * (high - low)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

export const sceneReady = () => art.ready && buddyArt.ready

export function create({ buddy, phase = 'day' } = {}) {
    const state = {
        look: BUDDY_LOOKS[buddy] ?? BUDDY_LOOKS.buddy_1,
        time: 0,
        phase: null,
        clouds: [],
        buddy: {
            x: 0, y: 0, facing: 1, pose: 'stand', walkTime: 0, settle: 0,
            hop: null, surprise: null, nextTurn: random(3, 6), turn: null
        },
        plan: [],
        lastActivity: null,
        nextBlink: random(1, 3),
        blinkUntil: -1
    }
    for (let n = 1; n <= layout.clouds; n++) {
        const at = layout[`day/cloud_${n}`]
        state.clouds.push({ key: `day/cloud_${n}`, x: at.x, y: at.y, homeY: at.y, w: at.w, speed: random(5, 12) })
    }
    enterPhase(state, phase)
    return state
}

function enterPhase(state, phase) {
    state.phase = phase
    state.plan = []
    const b = state.buddy
    b.hop = null
    b.surprise = null
    if (phase === 'evening') {
        place(b, FIRE_SPOT, 'sit')
    } else if (phase === 'day') {
        // Begin settled at a random activity's place, so the first frame is calm.
        const start = pick(['sea', 'read', 'stand'])
        if (start === 'sea') place(b, SEA_SPOT, 'sit')
        else if (start === 'read') place(b, READ_SPOT, 'read')
        else place(b, strollPoint(), 'stand')
        state.lastActivity = start
        state.plan.push({ pose: b.pose, duration: random(4, 8) })
    }
}

function place(b, spot, pose) {
    b.x = spot.x
    b.y = spot.y
    b.facing = spot.facing ?? b.facing
    b.pose = pose
}

const strollPoint = () => ({
    x: random(STROLL.left, STROLL.right),
    y: random(STROLL.top, STROLL.bottom)
})

// The next thing to do, as a list of steps: walk somewhere, or hold a pose.
function planNext(state) {
    if (state.phase === 'evening') {
        const pose = state.buddy.pose === 'read' ? 'sit' : 'read'
        state.plan.push({ pose, duration: pose === 'read' ? random(10, 16) : random(7, 12) })
        return
    }
    const choices = ['stroll', 'stroll', 'sea', 'read'].filter((a) => a !== state.lastActivity || a === 'stroll')
    const activity = pick(choices)
    state.lastActivity = activity
    if (activity === 'sea') {
        state.plan.push({ walkTo: SEA_SPOT }, { pose: 'sit', facing: SEA_SPOT.facing, duration: random(9, 15) })
    } else if (activity === 'read') {
        state.plan.push({ walkTo: READ_SPOT }, { pose: 'read', facing: READ_SPOT.facing, duration: random(10, 16) })
    } else {
        const legs = 1 + Math.floor(Math.random() * 3)
        for (let n = 0; n < legs; n++) {
            state.plan.push({ walkTo: strollPoint() }, { pose: 'stand', duration: random(1, 2.6) })
        }
    }
}

function setPose(b, pose) {
    if (b.pose !== pose) {
        b.pose = pose
        b.settle = SETTLE_TIME
    }
}

export function update(state, dt, phase) {
    state.time += dt
    if (phase !== state.phase) enterPhase(state, phase)

    for (const cloud of state.clouds) {
        cloud.x += cloud.speed * dt
        if (cloud.x > STAGE_W) {
            // Back in from the left after a random gap, at a slightly different height.
            cloud.x = -cloud.w - random(20, 260)
            cloud.y = cloud.homeY + random(-25, 25)
            cloud.speed = random(5, 12)
        }
    }

    if (state.time >= state.nextBlink) {
        state.blinkUntil = state.time + BLINK_TIME
        // Now and then a double blink.
        state.nextBlink = state.time + (Math.random() < 0.2 ? 0.32 : random(2.5, 6))
    }

    const b = state.buddy
    b.settle = Math.max(0, b.settle - dt)
    if (b.hop !== null) {
        b.hop += dt
        if (b.hop >= HOP_TIME) b.hop = null
    }
    if (b.surprise !== null) {
        b.surprise += dt
        if (b.surprise >= SURPRISE_TIME) b.surprise = null
    }
    if (b.pose === 'read') {
        if (b.turn === null) {
            b.nextTurn -= dt
            if (b.nextTurn <= 0) b.turn = 0
        } else {
            b.turn += dt
            if (b.turn >= TURN_TIME) {
                b.turn = null
                b.nextTurn = random(3, 7)
            }
        }
    } else {
        b.turn = null
    }
    if (phase === 'bed') return

    if (state.plan.length === 0) planNext(state)
    const step = state.plan[0]
    if (step.walkTo) {
        const dx = step.walkTo.x - b.x
        const dy = step.walkTo.y - b.y
        const distance = Math.hypot(dx, dy)
        setPose(b, 'walk')
        if (Math.abs(dx) > 1) b.facing = Math.sign(dx)
        const move = WALK_SPEED * dt
        if (distance <= move) {
            b.x = step.walkTo.x
            b.y = step.walkTo.y
            state.plan.shift()
        } else {
            b.x += (dx / distance) * move
            b.y += (dy / distance) * move
            b.walkTime += dt
        }
    } else {
        setPose(b, step.pose)
        if (step.facing) b.facing = step.facing
        step.duration -= dt
        if (step.duration <= 0) state.plan.shift()
    }
}

// The buddy's picture right now, and where it stands on the stage.
function buddyFrame(state) {
    const b = state.buddy
    const pose = b.pose === 'walk' || b.pose === 'stand' ? state.look.walk : state.look.sit
    const image = buddyArt[pose.art]
    const w = image.naturalWidth * pose.scale
    const h = image.naturalHeight * pose.scale
    return { pose, image, box: { x: b.x - w / 2, y: b.y - h, w, h } }
}

/**
 * What the buddy is doing, for the line under the scene: 'stroll', 'sea' and
 * 'read' by day, 'fire' and 'fireRead' in the evening, 'bed' at bed time.
 */
export function activityOf(state) {
    if (state.phase === 'bed') return 'bed'
    const pose = state.buddy.pose
    if (state.phase === 'evening') return pose === 'read' ? 'fireRead' : 'fire'
    if (pose === 'read') return 'read'
    if (pose === 'sit') return 'sea'
    return 'stroll'
}

/** A click or tap at stage (x, y): a buddy that is hit hops and looks out, surprised. */
export function tap(state, x, y) {
    if (!hitsBuddy(state, x, y)) return false
    if (state.buddy.hop === null) state.buddy.hop = 0
    state.buddy.surprise = 0
    return true
}

export function hitsBuddy(state, x, y) {
    if (state.phase === 'bed' || !sceneReady()) return false
    const { box } = buddyFrame(state)
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
}

function put(ctx, key) {
    const at = layout[key]
    ctx.drawImage(art[key], at.x, at.y)
}

export function draw(ctx, state) {
    if (!sceneReady()) {
        ctx.fillStyle = state.phase === 'day' ? '#aec4d4' : '#2c4f91'
        ctx.fillRect(0, 0, STAGE_W, STAGE_H)
        return
    }
    const set = state.phase === 'day' ? 'day' : 'night'
    put(ctx, `${set}/sky`)
    if (set === 'day') {
        for (const cloud of state.clouds) ctx.drawImage(art[cloud.key], cloud.x, cloud.y)
    } else {
        put(ctx, 'night/moon')
    }
    const frame = 1 + Math.floor(state.time / FIRE_FRAME_TIME) % layout.fireFrames
    const flicker = glowBreath(state.time)
    put(ctx, `${set}/land`)
    if (set === 'night') drawGlow(ctx, FIRE_BASE, GROUND_LIGHT * flicker, 0.3, GROUND_BANDS)
    put(ctx, `${set}/tent`)
    if (state.phase === 'bed') drawSleeper(ctx, state)
    put(ctx, `${set}/tent_border`)
    if (set === 'night') drawGlow(ctx, FLAME, HALO * flicker, 1, HALO_BANDS)
    if (state.phase !== 'bed') {
        drawBuddy(ctx, state)
        if (set === 'night') lightBuddy(ctx, state, flicker)
    }
    put(ctx, `${set}/wood`)
    if (set === 'night') put(ctx, `night/fire_${frame}`)
    put(ctx, `${set}/plant`)
}

const WARM = '255, 186, 96'

// The light falls off in steps, like the glow drawn around the moon: rings of
// even strength, [outer edge as a share of the radius, opacity], inside out.
// Each ring's edge is blurred over FEATHER of the radius, so the steps read
// without cutting hard.
const GROUND_BANDS = [[0.45, 0.36], [0.71, 0.24], [1, 0.12]]
const HALO_BANDS = [[0.7, 0.22], [1, 0.11]]
const FEATHER = 0.07

// A round light in rings, squashed to `flat` of its height.
function drawGlow(ctx, at, radius, flat, bands) {
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.scale(1, flat)
    const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    light.addColorStop(0, `rgba(${WARM}, ${bands[0][1]})`)
    bands.forEach(([edge, strength], n) => {
        const next = n + 1 < bands.length ? bands[n + 1][1] : 0
        light.addColorStop(Math.max(0, edge - FEATHER), `rgba(${WARM}, ${strength})`)
        light.addColorStop(edge, `rgba(${WARM}, ${next})`)
    })
    ctx.fillStyle = light
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

// Made on first use: the module loads before the page has a document to draw in.
const lightLayer = { canvas: null }

// The buddy catches the firelight on the side facing the fire, more the closer
// it is. The light is laid on in soft-light, so the black outline stays black.
function lightBuddy(ctx, state, flicker) {
    const { box } = buddyFrame(state)
    const cx = box.x + box.w / 2
    const reach = Math.hypot(cx - FIRE_BASE.x, box.y + box.h / 2 - FIRE_BASE.y)
    const amount = Math.max(0, 1 - reach / (BUDDY_LIGHT * flicker))
    if (amount <= 0) return
    if (!lightLayer.canvas) {
        lightLayer.canvas = document.createElement('canvas')
        lightLayer.canvas.width = STAGE_W
        lightLayer.canvas.height = STAGE_H
    }
    const lc = lightLayer.canvas.getContext('2d')
    lc.globalCompositeOperation = 'source-over'
    lc.clearRect(0, 0, STAGE_W, STAGE_H)
    drawBuddy(lc, state)
    lc.globalCompositeOperation = 'source-in'
    const near = cx < FIRE_BASE.x ? box.x + box.w : box.x
    const far = cx < FIRE_BASE.x ? box.x : box.x + box.w
    const side = lc.createLinearGradient(near, 0, far, 0)
    side.addColorStop(0, `rgba(${WARM}, ${0.95 * amount})`)
    side.addColorStop(1, `rgba(${WARM}, ${0.35 * amount})`)
    lc.fillStyle = side
    lc.fillRect(box.x - 40, box.y - 60, box.w + 80, box.h + 80)
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.drawImage(lightLayer.canvas, 0, 0)
    ctx.restore()
}

// The bump under the blanket rises and falls, from its bottom edge.
function drawSleeper(ctx, state) {
    const at = layout['night/sleeping']
    const swell = 1 + SLEEP_BREATH * (0.5 + 0.5 * Math.sin((state.time * 2 * Math.PI) / SLEEP_PERIOD))
    ctx.save()
    ctx.translate(at.x + at.w / 2, at.y + at.h)
    ctx.scale(1 + (swell - 1) * 0.3, swell)
    ctx.drawImage(art['night/sleeping'], -at.w / 2, -at.h)
    ctx.restore()
}

function drawBuddy(ctx, state) {
    const b = state.buddy
    const { pose, image } = buddyFrame(state)
    const iw = image.naturalWidth
    const ih = image.naturalHeight

    let lift = 0
    let tilt = 0
    let sx = 1
    let sy = 1
    if (b.pose === 'walk') {
        const phase = b.walkTime * STEPS_PER_SECOND * Math.PI
        lift = Math.abs(Math.sin(phase)) * STEP_LIFT
        tilt = Math.sin(phase) * 0.04
    } else {
        const breath = Math.sin((state.time * 2 * Math.PI) / BREATH_PERIOD)
        sy = 1 + BREATH * breath
        sx = 1 - BREATH * 0.4 * breath
    }
    if (b.settle > 0) {
        const squash = 0.07 * (b.settle / SETTLE_TIME)
        sy *= 1 - squash
        sx *= 1 + squash * 0.6
    }
    if (b.hop !== null) {
        const t = b.hop / HOP_TIME
        lift += Math.sin(Math.PI * t) * HOP_HEIGHT
        // Stretch on the way up, squash on landing.
        if (t < 0.5) {
            sy *= 1 + 0.06 * Math.sin(Math.PI * t * 2)
        } else if (t > 0.85) {
            sy *= 1 - 0.08 * Math.sin(Math.PI * (t - 0.85) / 0.15)
        }
    }

    ctx.save()
    ctx.translate(b.x, b.y - lift)
    ctx.rotate(tilt)
    ctx.scale(b.facing * pose.scale * sx, pose.scale * sy)
    let face = image
    if (b.surprise !== null) face = surprisedEyesOf(pose)
    else if (state.time < state.blinkUntil) face = closedEyesOf(pose)
    ctx.drawImage(face, -iw / 2, -ih)
    if (b.pose === 'read') drawBook(ctx, b, state.look.book.x - iw / 2, state.look.book.y - ih)
    ctx.restore()
}

// The book on the lap; while a page turns, its three frames in turn.
function drawBook(ctx, b, left, bottom) {
    const frame = b.turn === null
        ? 'bookOpen'
        : BOOK_TURN_FRAMES[Math.min(BOOK_TURN_FRAMES.length - 1, Math.floor((b.turn / TURN_TIME) * BOOK_TURN_FRAMES.length))]
    const image = buddyArt[frame]
    ctx.drawImage(image, left, bottom - image.naturalHeight)
}
