import mattiFigure from '../assets/buddyAvatar/figures/matti.png'
import pandaFigure from '../assets/buddyAvatar/figures/panda.png'
import ppFigure from '../assets/buddyAvatar/figures/pp.png'
import mattiMap from '../assets/buddyAvatar/map/matti.png'
import pandaMap from '../assets/buddyAvatar/map/panda.png'
import ppMap from '../assets/buddyAvatar/map/pp.png'
import './BuddyAvatar.css'

// Listed in the order they stand on the sprite sheet; the ids stay as saved in users.avatar
export const BUDDIES = [
    { id: 'buddy_3', name: 'Matti' },
    { id: 'buddy_1', name: 'Panda' },
    { id: 'buddy_2', name: 'P.P.' },
]

// The icon is the buddy's face as it walks the maps: a square cut from its map
// figure (build/maps/draw_buddies.py), so the header and the maps show one
// face. All three figures share one 262 x 380 frame; x, y and size are the
// square in that frame's pixels.
const MAP_FRAME_W = 262
const BUDDY_FACES = {
    buddy_1: { src: pandaMap, x: 0, y: 62, size: 262 },
    buddy_2: { src: ppMap, x: 8, y: 14, size: 244 },
    buddy_3: { src: mattiMap, x: 9, y: -6, size: 242 },
}

// One PNG per figure, cut out of diploma_buddies-Sheet.png (1440×1080) along
// each figure's own pixels, since their bounding boxes overlap on the sheet.
// w and h are the crop sizes in sheet pixels, which keeps the sheet's scale.
const BUDDY_FIGURES = {
    buddy_1: { src: pandaFigure, w: 479, h: 618 },
    buddy_2: { src: ppFigure, w: 429, h: 1022 },
    buddy_3: { src: mattiFigure, w: 441, h: 1034 },
}

// Every buddy is drawn at one shared scale inside a frame as wide as the widest
// figure and as tall as the tallest, standing on the frame's bottom edge
const FRAME_W = Math.max(...Object.values(BUDDY_FIGURES).map(f => f.w))
const FRAME_H = Math.max(...Object.values(BUDDY_FIGURES).map(f => f.h))
const FRAME_ASPECT = FRAME_H / FRAME_W

export function BuddyIcon({ buddyId, size = 36 }) {
    const face = BUDDY_FACES[buddyId]
    if (face == null) return null
    const scale = size / face.size
    return (
        <span
            className="buddy-icon"
            role="img"
            aria-label={BUDDIES.find(b => b.id === buddyId)?.name ?? ''}
            style={{ width: size, height: size }}
        >
            <img
                src={face.src}
                alt=""
                style={{ width: MAP_FRAME_W * scale, left: -face.x * scale, top: -face.y * scale }}
            />
        </span>
    )
}

export function BuddySprite({ buddyId, size = 120 }) {
    const figure = BUDDY_FIGURES[buddyId]
    const h = Math.round(size * FRAME_ASPECT)
    if (figure == null) {
        return (
            <div
                className="buddy-sprite buddy-sprite--empty"
                style={{ width: size, height: h }}
            >
                ?
            </div>
        )
    }
    const scale = size / FRAME_W
    // The figure's width is a share of the frame, so a frame that a narrow
    // container shrinks (the dashboard picker on a phone) scales it as a whole.
    return (
        <div
            className="buddy-sprite"
            style={{ width: size, height: h, aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
        >
            <img
                className="buddy-sprite__figure"
                src={figure.src}
                alt=""
                width={Math.round(figure.w * scale)}
                height={Math.round(figure.h * scale)}
                style={{ width: `${(figure.w / FRAME_W) * 100}%`, height: 'auto' }}
            />
        </div>
    )
}
