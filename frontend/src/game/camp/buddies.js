// The buddies' pictures at the camp, one folder per buddy in assets/camp/buddies.
//
// walk.png       standing and walking (copied from the JÄÄRETKI sprites)
// sit.png        sitting, also under the book when reading (copied from DELFIININ REITTI)
// book_open.png       the open book lying on the lap, seen from the side;
//                     shared by all three, drawn by build/camp/draw_book.py
// book_turn_1..3.png  a page turning, three frames of the same size
//
// Every picture faces right. To swap in hand-drawn art, replace a PNG with one
// of the same pose and update its numbers here, all in that PNG's own pixels:
//   eyes  the rectangles the face animates: squashed for a blink, moved and
//         enlarged when the buddy is tapped
//   book  where the book's bottom-left corner sits on sit.png while reading

import { loadArt } from '../minigames/art.js'
import bookOpenUrl from '../../assets/camp/buddies/book_open.png'
import bookTurn1Url from '../../assets/camp/buddies/book_turn_1.png'
import bookTurn2Url from '../../assets/camp/buddies/book_turn_2.png'
import bookTurn3Url from '../../assets/camp/buddies/book_turn_3.png'
import mattiSitUrl from '../../assets/camp/buddies/matti/sit.png'
import mattiWalkUrl from '../../assets/camp/buddies/matti/walk.png'
import pandaSitUrl from '../../assets/camp/buddies/panda/sit.png'
import pandaWalkUrl from '../../assets/camp/buddies/panda/walk.png'
import ppSitUrl from '../../assets/camp/buddies/pp/sit.png'
import ppWalkUrl from '../../assets/camp/buddies/pp/walk.png'

// Sprite pixels to scene pixels. The walking sprites were drawn larger than the
// sitting ones, so they get a smaller scale; a standing buddy still ends up a
// little taller than a sitting one.
export const SIT_SCALE = 0.85
export const WALK_SCALE = 0.65

// When the buddy is tapped its eyes jump, in one frame, to a bigger pair moved
// a little towards the back of the face, as if it turned to look at the pupil.
// In sprite pixels.
const LOOK = { x: -5, y: -1 }
const SURPRISED_EYES = 1.5

export const BOOK_TURN_FRAMES = ['bookTurn1', 'bookTurn2', 'bookTurn3']

export const buddyArt = loadArt({
    bookOpen: bookOpenUrl,
    bookTurn1: bookTurn1Url,
    bookTurn2: bookTurn2Url,
    bookTurn3: bookTurn3Url,
    mattiSit: mattiSitUrl,
    mattiWalk: mattiWalkUrl,
    pandaSit: pandaSitUrl,
    pandaWalk: pandaWalkUrl,
    ppSit: ppSitUrl,
    ppWalk: ppWalkUrl
})

const walk = (art, eyes) => ({ art, eyes, scale: WALK_SCALE, look: LOOK })
const sit = (art, eyes) => ({ art, eyes, scale: SIT_SCALE, look: LOOK })

// Keyed by the id saved in users.avatar.
export const BUDDY_LOOKS = {
    buddy_1: {
        walk: walk('pandaWalk', [{ x: 127, y: 129, w: 12, h: 11 }]),
        sit: sit('pandaSit', [{ x: 94, y: 92, w: 11, h: 12 }]),
        book: { x: 70, y: 202 }
    },
    buddy_2: {
        walk: walk('ppWalk', [{ x: 130, y: 73, w: 12, h: 11 }]),
        sit: sit('ppSit', [{ x: 86, y: 68, w: 12, h: 11 }]),
        book: { x: 74, y: 166 }
    },
    buddy_3: {
        walk: walk('mattiWalk', [{ x: 144, y: 87, w: 12, h: 12 }]),
        sit: sit('mattiSit', [{ x: 85, y: 80, w: 12, h: 13 }]),
        book: { x: 70, y: 176 }
    }
}

const eyeless = new Map()
const closed = new Map()

/**
 * The sprite with its eyes taken out: each eye rectangle is painted over with
 * the skin colour found just left of it. The face animations draw the eyes back
 * on top of this. Made once per picture, after it has loaded.
 */
export function eyelessOf(pose) {
    const cached = eyeless.get(pose.art)
    if (cached) return cached
    const image = buddyArt[pose.art]
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image, 0, 0)
    for (const eye of pose.eyes) {
        const [r, g, b] = ctx.getImageData(eye.x - 2, eye.y + Math.floor(eye.h / 2), 1, 1).data
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(eye.x, eye.y, eye.w, eye.h)
    }
    eyeless.set(pose.art, canvas)
    return canvas
}

/** The sprite with its eyes shut: each eye pressed to a third of its height, at its lower edge. */
export function closedEyesOf(pose) {
    const cached = closed.get(pose.art)
    if (cached) return cached
    const image = buddyArt[pose.art]
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(eyelessOf(pose), 0, 0)
    for (const eye of pose.eyes) {
        const lid = Math.max(2, Math.round(eye.h / 3))
        ctx.drawImage(image, eye.x, eye.y, eye.w, eye.h, eye.x, eye.y + eye.h - lid - 1, eye.w, lid)
    }
    closed.set(pose.art, canvas)
    return canvas
}

const surprised = new Map()

/** The sprite with bigger eyes, moved towards `pose.look` and lit by a catchlight: the face of a tapped buddy. */
export function surprisedEyesOf(pose) {
    const cached = surprised.get(pose.art)
    if (cached) return cached
    const image = buddyArt[pose.art]
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(eyelessOf(pose), 0, 0)
    for (const eye of pose.eyes) {
        const w = Math.round(eye.w * SURPRISED_EYES)
        const h = Math.round(eye.h * SURPRISED_EYES)
        const x = Math.round(eye.x + eye.w / 2 + pose.look.x - w / 2)
        const y = Math.round(eye.y + eye.h / 2 + pose.look.y - h / 2)
        ctx.drawImage(image, eye.x, eye.y, eye.w, eye.h, x, y, w, h)
        // A white catchlight in the upper front corner of the eye.
        const shine = Math.max(2, Math.round(w * 0.3))
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x + w - shine - Math.round(w * 0.15), y + Math.round(h * 0.15), shine, shine)
    }
    surprised.set(pose.art, canvas)
    return canvas
}
