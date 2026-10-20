// G6 SIEMENSADE — catch the falling seeds before they reach the river.
//
// One endless run at constant difficulty: the fall speed, the spacing and the
// basket never change, and there are no rounds. The only number that grows is
// the pupil's own score. See docs/puzzle-scenes-design.md section 4.
//
// Driven by <MiniGameCanvas>: create() builds the state, update() advances it by
// a fixed step, draw() paints it. Nothing here touches the DOM.

const WIDTH = 640
const HEIGHT = 400

// Fixed for the whole run, on purpose.
const SEED_EVERY = 0.7     // s between seeds
const FALL = 200           // px/s a seed falls
const BASKET_SPEED = 430   // px/s the basket moves under the arrow keys
const BASKET_W = 104
const BASKET_H = 44
const BASKET_Y = 312
const REACH = 150          // px a new seed may sit from the one before it
const MARGIN = 54
const MISSES_ALLOWED = 3
const SEED_R = 9

const UNIT_CIRCLE = new Path2D('M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z')

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

function disc(ctx, x, y, radius) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(radius, radius)
    // eslint-disable-next-line unicorn/no-array-fill-with-reference-type -- CanvasRenderingContext2D#fill, not Array#fill
    ctx.fill(UNIT_CIRCLE)
    ctx.restore()
}

/**
 * Seeds are placed fair by construction: the next one never lands further from
 * the last one than the basket can travel while it falls, so no pair is
 * impossible to reach.
 */
function addSeed(state) {
    const from = state.seeds.at(-1)?.x ?? WIDTH / 2
    const x = clamp(
        from + (Math.random() * 2 - 1) * REACH,
        MARGIN,
        WIDTH - MARGIN
    )
    state.seeds.push({ x, y: -SEED_R, spin: Math.random() * Math.PI })
}

const seedRain = {
    id: 'siemensade',
    width: WIDTH,
    height: HEIGHT,
    unit: 'siementä',
    // Finnish, pupil-facing.
    hint: 'Nuolet tai sormi: liikuta koria. Kolme ohi mennyttä, ja peli päättyy.',

    create: () => ({
            x: WIDTH / 2,
            seeds: [],
            sinceSeed: 0,
            sprouts: [],
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

        if (input.left) state.x -= BASKET_SPEED * dt
        if (input.right) state.x += BASKET_SPEED * dt
        // A finger or a held mouse drags the basket straight to it.
        if (input.pointerX !== null) state.x = input.pointerX * WIDTH
        state.x = clamp(state.x, BASKET_W / 2, WIDTH - BASKET_W / 2)

        state.sinceSeed += dt
        if (state.sinceSeed >= SEED_EVERY) {
            state.sinceSeed -= SEED_EVERY
            addSeed(state)
        }

        const left = state.x - BASKET_W / 2
        const right = state.x + BASKET_W / 2
        const kept = []
        for (const seed of state.seeds) {
            seed.y += FALL * dt
            const isAtRim = seed.y + SEED_R >= BASKET_Y && seed.y - SEED_R <= BASKET_Y + BASKET_H
            if (isAtRim && seed.x > left && seed.x < right) {
                state.score += 1
                state.sprouts.push({ x: seed.x, age: 0 })
                continue
            }
            if (seed.y - SEED_R > HEIGHT) {
                state.misses += 1
                continue
            }
            kept.push(seed)
        }
        state.seeds = kept

        for (const sprout of state.sprouts) sprout.age += dt
        state.sprouts = state.sprouts.filter((sprout) => sprout.age < 1.1)

        if (state.misses >= MISSES_ALLOWED) state.dead = true
    },

    draw(ctx, state) {
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
        sky.addColorStop(0, '#f6e6c0')
        sky.addColorStop(1, '#f0d9a8')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, WIDTH, HEIGHT)

        // The bare slope the seeds are meant for, and the river that takes the
        // ones that get past.
        ctx.fillStyle = '#c09a63'
        ctx.fillRect(0, BASKET_Y + BASKET_H, WIDTH, HEIGHT - BASKET_Y - BASKET_H)
        ctx.fillStyle = '#3f6b86'
        ctx.fillRect(0, HEIGHT - 44, WIDTH, 44)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillRect(0, HEIGHT - 44, WIDTH, 4)

        for (const sprout of state.sprouts) {
            const grow = Math.min(sprout.age / 0.5, 1)
            // A rect rather than a stroked path: the stem is the same two
            // points every frame, only its height changes.
            ctx.fillStyle = '#4f8a43'
            ctx.fillRect(sprout.x - 2, BASKET_Y + BASKET_H + 22 - 26 * grow, 4, 26 * grow)
            ctx.fillStyle = '#5c9b4d'
            disc(ctx, sprout.x, BASKET_Y + BASKET_H + 22 - 26 * grow, 9 * grow)
        }

        for (const seed of state.seeds) {
            ctx.save()
            ctx.translate(seed.x, seed.y)
            ctx.rotate(seed.spin + seed.y / 90)
            ctx.fillStyle = '#6b4a2a'
            ctx.beginPath()
            ctx.ellipse(0, 0, SEED_R * 0.68, SEED_R, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#8a6a3c'
            ctx.beginPath()
            ctx.ellipse(-2, -2, SEED_R * 0.26, SEED_R * 0.42, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        // The basket.
        ctx.save()
        ctx.translate(state.x, BASKET_Y)
        ctx.fillStyle = '#b07a3e'
        ctx.strokeStyle = '#4a3520'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-BASKET_W / 2, 0)
        ctx.lineTo(BASKET_W / 2, 0)
        ctx.lineTo(BASKET_W / 2 - 14, BASKET_H)
        ctx.lineTo(-BASKET_W / 2 + 14, BASKET_H)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = 'rgba(74,53,32,0.45)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-BASKET_W / 2 + 6, 15)
        ctx.lineTo(BASKET_W / 2 - 6, 15)
        ctx.moveTo(-BASKET_W / 2 + 10, 29)
        ctx.lineTo(BASKET_W / 2 - 10, 29)
        ctx.stroke()
        ctx.restore()

        // Lives, as three seeds that go out.
        for (let i = 0; i < MISSES_ALLOWED; i++) {
            ctx.fillStyle = i < MISSES_ALLOWED - state.misses ? '#6b4a2a' : 'rgba(107,74,42,0.22)'
            disc(ctx, WIDTH - 28 - i * 24, 26, 8)
        }
    }
}

export default seedRain
