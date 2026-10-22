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
import heartEmptyUrl from '../../assets/minigames/siemensade/heart_empty.png'
import heartFullUrl from '../../assets/minigames/siemensade/heart_full.png'
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
    heartEmpty: heartEmptyUrl,
    heartFull: heartFullUrl,
    seed1: seed1Url,
    seed2: seed2Url,
    seed3: seed3Url
})
const SKY = '#a3dcf9'
const FRUITS = ['seed1', 'seed2', 'seed3']

// The player's buddy carries the basket. Every buddy holds it the same way: hand
// at the basket's left edge, feet on the same line, so only the height differs.
// Offsets are from the basket's top-left corner.
const CARRIERS = {
    buddy_1: { look: 'charPanda', dx: 5.5, dy: -8.5 },
    buddy_2: { look: 'charPp', dx: 5.5, dy: -49.5 },
    buddy_3: { look: 'charMatti', dx: 5.5, dy: -56 }
}

// Fixed for the whole run, on purpose.
const FRUIT_EVERY = 0.7    // s between fruit
const FALL = 200           // px/s a fruit falls
const BASKET_SPEED = 430   // px/s the basket moves under the arrow keys
const BASKET_W = 95.5
const BASKET_TOP = 284.5
const RIM_TOP = BASKET_TOP + 4
const RIM_BOTTOM = BASKET_TOP + 34
const RIM_INSET = 8        // the basket's walls, which do not catch
const REACH = 150          // px a new fruit may sit from the one before it
const MISSES_ALLOWED = 3
const FRUIT_R = 21
const HEART_X = 29.5
const HEART_Y = 343
const HEART_STEP = 45.25

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

const carrierOf = (buddy) => CARRIERS[buddy] ?? CARRIERS.buddy_1

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
    // Finnish, pupil-facing.
    hint: 'Nuolet tai sormi: liikuta koria. Kolme ohi mennyttä, ja peli päättyy.',

    create: ({ buddy } = {}) => ({
            buddy,
            // Where the basket stands in the picture.
            x: 327.75,
            fruits: [],
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

        state.sinceFruit += dt
        if (state.sinceFruit >= FRUIT_EVERY) {
            state.sinceFruit -= FRUIT_EVERY
            addFruit(state, range)
        }

        const left = state.x - BASKET_W / 2 + RIM_INSET
        const right = state.x + BASKET_W / 2 - RIM_INSET
        const kept = []
        for (const fruit of state.fruits) {
            fruit.y += FALL * dt
            const isAtRim = fruit.y >= RIM_TOP && fruit.y <= RIM_BOTTOM
            if (isAtRim && fruit.x > left && fruit.x < right) {
                state.score += 1
                continue
            }
            if (fruit.y - FRUIT_R > HEIGHT) {
                state.misses += 1
                continue
            }
            kept.push(fruit)
        }
        state.fruits = kept

        if (state.misses >= MISSES_ALLOWED) state.dead = true
    },

    draw(ctx, state) {
        ctx.fillStyle = SKY
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        // Until the pictures have decoded the run is simply sky.
        if (!art.ready) return

        ctx.drawImage(art.bg, 0, 0, WIDTH, HEIGHT)

        // Drawn under the basket, so a caught fruit drops into it.
        for (const fruit of state.fruits) {
            const image = art[fruit.look]
            const w = image.naturalWidth / 2
            const h = image.naturalHeight / 2
            ctx.save()
            ctx.translate(fruit.x, fruit.y)
            ctx.rotate(Math.sin(fruit.sway + fruit.y / 40) * 0.25)
            ctx.drawImage(image, -w / 2, -h / 2, w, h)
            ctx.restore()
        }

        const basketLeft = state.x - BASKET_W / 2
        ctx.drawImage(art.basket, basketLeft, BASKET_TOP, BASKET_W, art.basket.naturalHeight / 2)

        // The buddy stands in front, one arm around the basket.
        const carrier = carrierOf(state.buddy)
        const body = art[carrier.look]
        ctx.drawImage(
            body,
            basketLeft + carrier.dx,
            BASKET_TOP + carrier.dy,
            body.naturalWidth / 2,
            body.naturalHeight / 2
        )

        // Lives, as three hearts that empty from the left.
        for (let i = 0; i < MISSES_ALLOWED; i++) {
            const heart = i < state.misses ? art.heartEmpty : art.heartFull
            ctx.drawImage(heart, HEART_X + i * HEART_STEP, HEART_Y, heart.naturalWidth / 2, heart.naturalHeight / 2)
        }
    }
}

export default seedRain
