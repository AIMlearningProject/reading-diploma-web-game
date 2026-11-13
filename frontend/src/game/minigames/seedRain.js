// G6 HEDELMÄSADE — catch the fruit falling from the tree before it hits the meadow.
//
// The game began as SIEMENSADE, seeds over a river, and is now fruit over grass.
// The id 'siemensade' stays because it is stored in the rewards table; the file
// and the asset names still say "seed" too.
//
// One endless run at constant difficulty: the fall speed, the spacing and the
// basket never change, and there are no rounds. The only number that grows is
// the pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

import { loadArt } from './art.js'
import basketUrl from '../../assets/minigames/siemensade/basket.png'
import bgUrl from '../../assets/minigames/siemensade/bg.png'
import charMattiUrl from '../../assets/minigames/siemensade/char_matti.png'
import charPandaUrl from '../../assets/minigames/siemensade/char_panda.png'
import charPpUrl from '../../assets/minigames/siemensade/char_pp.png'
import seed1Url from '../../assets/minigames/siemensade/seed_1.png'
import seed2Url from '../../assets/minigames/siemensade/seed_2.png'
import seed3Url from '../../assets/minigames/siemensade/seed_3.png'

const WIDTH = 640
const HEIGHT = 400

// The art is drawn at 2x, so a picture's logical size is half its pixels, and
// every position below is the layer's place in the 1280x800 source halved.
const art = loadArt({
    basket: basketUrl,
    bg: bgUrl,
    charMatti: charMattiUrl,
    charPanda: charPandaUrl,
    charPp: charPpUrl,
    seed1: seed1Url,
    seed2: seed2Url,
    seed3: seed3Url
})
const SKY = '#a3dcf9'
const FRUITS = ['seed1', 'seed2', 'seed3']

// The player's buddy carries the basket. Every buddy faces left with an arm out,
// so it stands to the right of the basket with that hand on the basket's wall and
// its feet on the same line. Offsets are from the basket's top-left corner.
const CARRIERS = {
    buddy_1: { look: 'charPanda', dx: 55, dy: -8.5 },
    buddy_2: { look: 'charPp', dx: 64, dy: -49.5 },
    buddy_3: { look: 'charMatti', dx: 64.5, dy: -56 }
}

// Fixed for the whole run, on purpose.
const FRUIT_EVERY = 0.7    // s between fruit
const FALL = 200           // px/s a fruit falls
const BASKET_SPEED = 430   // px/s the basket moves under the arrow keys
const BASKET_W = 95.5
const BASKET_TOP = 284.5
const RIM_TOP = BASKET_TOP + 4
const RIM_BOTTOM = BASKET_TOP + 34
const CATCH_MARGIN = 8     // px past each side of the basket that still catches, so a fruit on the rim counts
// The lower edge of the basket's opening, from its top. The picture tilts, so the
// edge sits lower on the right. Everything below it is the basket's front.
const LIP_LEFT = 20.7
const LIP_RIGHT = 22.85
const SINK_DEPTH = 50      // how far below BASKET_TOP a caught fruit is gone
const SINK_CENTRE = 8      // px from the basket's centre a caught fruit settles
const SINK_PULL = 260      // px/s a caught fruit slides towards the opening
const REACH = 150          // px a new fruit may sit from the one before it
const MISSES_ALLOWED = 3
const FRUIT_R = 21
const LAND_Y = 356         // a fruit's centre when its underside reaches the grass
// A fruit that lands leaves a solid stain in its own colour, a little wider than
// the fruit. A newer stain lies over an older one.
const SPLAT_Y = 379
const SPLAT_SPREAD = 4     // px a stain may sit above or below SPLAT_Y
const SPLAT_LIFE = 2.6     // s a stain lasts
const SPLAT_SHRINK = 0.4   // s of that spent shrinking away
// A fruit does not turn into its stain in one frame: it squashes flat on the
// grass while the stain spreads out from under it, so it is seen to land.
const SQUASH_TIME = 0.06   // s a landed fruit takes to squash away
const SPLAT_GROW = 0.07    // s a new stain takes to spread to its full size
const SPLAT_START = 0.3    // a new stain's size when it appears, as a share of full
const SPLAT_COLOURS = { seed1: '#ff1600', seed2: '#ff9a00', seed3: '#9a6add' }

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

const carrierOf = (buddy) => CARRIERS[buddy] ?? CARRIERS.buddy_1

const between = (low, high) => low + Math.random() * (high - low)

/** Every stain gets its own rough outline, built around (0, 0). */
function makeSplat(fruit) {
    const rx = between(27, 32)
    const ry = rx * 0.36
    const points = Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2
        const bump = between(0.72, 1.22)
        return [Math.cos(angle) * rx * bump, Math.sin(angle) * ry * bump]
    })
    const middle = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

    const path = new Path2D()
    path.moveTo(...middle(points.at(-1), points[0]))
    points.forEach((point, i) => {
        path.quadraticCurveTo(...point, ...middle(point, points[(i + 1) % points.length]))
    })
    path.closePath()
    return {
        path,
        x: fruit.x,
        y: SPLAT_Y + between(-SPLAT_SPREAD, SPLAT_SPREAD),
        colour: SPLAT_COLOURS[fruit.look],
        age: 0
    }
}

function drawSplat(ctx, splat) {
    const spread = clamp(splat.age / SPLAT_GROW, 0, 1)
    const growing = SPLAT_START + (1 - SPLAT_START) * (1 - (1 - spread) ** 2)
    const shrinking = clamp((SPLAT_LIFE - splat.age) / SPLAT_SHRINK, 0, 1)
    const size = Math.min(growing, shrinking)
    ctx.save()
    ctx.translate(splat.x, splat.y)
    ctx.scale(size, size)
    ctx.fillStyle = splat.colour
    ctx.fill(splat.path)
    ctx.restore()
}

const tiltOf = (fruit) => Math.sin(fruit.sway + fruit.y / 40) * 0.25

function drawFruit(ctx, fruit, x) {
    const image = art[fruit.look]
    const w = image.naturalWidth / 2
    const h = image.naturalHeight / 2
    ctx.save()
    ctx.translate(x, fruit.y)
    ctx.rotate(tiltOf(fruit))
    ctx.drawImage(image, -w / 2, -h / 2, w, h)
    ctx.restore()
}

/** A landed fruit squashing flat, pinned at its underside, and fading as it goes. */
function drawSquash(ctx, fruit) {
    const image = art[fruit.look]
    const w = image.naturalWidth / 2
    const h = image.naturalHeight / 2
    const done = clamp(fruit.squash / SQUASH_TIME, 0, 1)
    ctx.save()
    ctx.globalAlpha = 1 - done
    ctx.translate(fruit.x, fruit.y + h / 2)
    ctx.rotate(tiltOf(fruit) * (1 - done))
    ctx.scale(1 + 0.4 * done, 1 - 0.7 * done)
    ctx.drawImage(image, -w / 2, -h, w, h)
    ctx.restore()
}

/** How far the basket's centre may go, so neither it nor the buddy leaves the stage. */
function basketRange(carrier) {
    const image = art[carrier.look]
    const rightOfCentre = carrier.dx + image.naturalWidth / 2 - BASKET_W / 2
    return [BASKET_W / 2, WIDTH - rightOfCentre]
}

/**
 * Fruit is placed fair by construction: the next one never lands further from
 * the last one than the basket can travel while it falls, and never where the
 * basket cannot reach.
 */
function addFruit(state, [low, high]) {
    const from = state.fruits.at(-1)?.x ?? state.x
    const x = clamp(from + (Math.random() * 2 - 1) * REACH, low, high)
    state.fruits.push({
        x,
        y: -FRUIT_R * 2.5,
        look: FRUITS[Math.floor(Math.random() * FRUITS.length)],
        sway: Math.random() * Math.PI * 2
    })
}

const seedRain = {
    id: 'siemensade',
    width: WIDTH,
    height: HEIGHT,
    unit: 'hedelmää',
    lives: MISSES_ALLOWED,
    // Finnish, pupil-facing.
    hint: 'Nuolet tai sormi: liikuta koria. Kolme ohi mennyttä, ja peli päättyy.',

    create: ({ buddy } = {}) => ({
            buddy,
            // Where the basket starts, so basket and buddy stand mid-stage together.
            x: 287,
            fruits: [],
            sinking: [],
            squashing: [],
            splats: [],
            sinceFruit: 0,
            misses: 0,
            score: 0,
            dead: false,
            awake: false
        }),

    update(state, dt, input) {
        if (state.dead) return

        if (!state.awake) {
            if (!input.justPressed && !input.left && !input.right) return
            state.awake = true
        }

        const range = art.ready ? basketRange(carrierOf(state.buddy)) : [BASKET_W / 2, WIDTH - BASKET_W / 2]

        if (input.left) state.x -= BASKET_SPEED * dt
        if (input.right) state.x += BASKET_SPEED * dt
        // A finger or a held mouse drags the basket straight to it.
        if (input.pointerX !== null) state.x = input.pointerX * WIDTH
        state.x = clamp(state.x, range[0], range[1])

        // After the last miss the fruit in the air holds still while the one that
        // landed squashes, and the run ends once it has.
        const isOutOfLives = state.misses >= MISSES_ALLOWED

        state.sinceFruit += dt
        if (!isOutOfLives && state.sinceFruit >= FRUIT_EVERY) {
            state.sinceFruit -= FRUIT_EVERY
            addFruit(state, range)
        }

        const left = state.x - BASKET_W / 2 - CATCH_MARGIN
        const right = state.x + BASKET_W / 2 + CATCH_MARGIN
        const kept = []
        const falling = isOutOfLives ? [] : state.fruits
        for (const fruit of falling) {
            fruit.y += FALL * dt
            const isAtRim = fruit.y >= RIM_TOP && fruit.y <= RIM_BOTTOM
            if (isAtRim && fruit.x > left && fruit.x < right) {
                state.score += 1
                state.sinking.push({ ...fruit, offset: fruit.x - state.x })
                continue
            }
            if (fruit.y >= LAND_Y) {
                state.misses += 1
                fruit.y = LAND_Y
                state.splats.push(makeSplat(fruit))
                state.squashing.push({ ...fruit, squash: 0 })
                continue
            }
            kept.push(fruit)
        }
        if (!isOutOfLives) state.fruits = kept

        // A caught fruit keeps falling into the basket and rides along with it.
        for (const fruit of state.sinking) {
            fruit.y += FALL * dt
            const settled = clamp(fruit.offset, -SINK_CENTRE, SINK_CENTRE)
            fruit.offset += clamp(settled - fruit.offset, -SINK_PULL * dt, SINK_PULL * dt)
        }
        state.sinking = state.sinking.filter((fruit) => fruit.y < BASKET_TOP + SINK_DEPTH)

        for (const fruit of state.squashing) fruit.squash += dt
        state.squashing = state.squashing.filter((fruit) => fruit.squash < SQUASH_TIME)

        for (const splat of state.splats) splat.age += dt
        state.splats = state.splats.filter((splat) => splat.age < SPLAT_LIFE)

        if (state.misses >= MISSES_ALLOWED && state.squashing.length === 0) state.dead = true
    },

    draw(ctx, state) {
        ctx.fillStyle = SKY
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        // Until the pictures have decoded the run is simply sky.
        if (!art.ready) return

        ctx.drawImage(art.bg, 0, 0, WIDTH, HEIGHT)

        for (const splat of state.splats) drawSplat(ctx, splat)
        for (const fruit of state.squashing) drawSquash(ctx, fruit)

        const basketLeft = state.x - BASKET_W / 2
        const basketH = art.basket.naturalHeight / 2
        ctx.drawImage(art.basket, basketLeft, BASKET_TOP, BASKET_W, basketH)

        // Fruit passes over the back of the rim and behind the front of the basket,
        // so a caught fruit is seen dropping in through the opening.
        for (const fruit of state.fruits) drawFruit(ctx, fruit, fruit.x)
        for (const fruit of state.sinking) drawFruit(ctx, fruit, state.x + fruit.offset)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(basketLeft, BASKET_TOP + LIP_LEFT)
        ctx.lineTo(basketLeft + BASKET_W, BASKET_TOP + LIP_RIGHT)
        ctx.lineTo(basketLeft + BASKET_W, BASKET_TOP + basketH)
        ctx.lineTo(basketLeft, BASKET_TOP + basketH)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(art.basket, basketLeft, BASKET_TOP, BASKET_W, basketH)
        ctx.restore()

        // The buddy stands beside the basket, one hand on its wall.
        const carrier = carrierOf(state.buddy)
        const body = art[carrier.look]
        ctx.drawImage(
            body,
            basketLeft + carrier.dx,
            BASKET_TOP + carrier.dy,
            body.naturalWidth / 2,
            body.naturalHeight / 2
        )
    }
}

export default seedRain
