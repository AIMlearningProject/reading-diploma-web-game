import mattiFigure from '../assets/buddyAvatar/figures/matti.png'
import pandaFigure from '../assets/buddyAvatar/figures/panda.png'
import ppFigure from '../assets/buddyAvatar/figures/pp.png'
import pandaIcon from '../assets/buddyAvatar/panda/panda_icon.png'
import './BuddyAvatar.css'

// Listed in the order they stand on the sprite sheet; the ids stay as saved in users.avatar
export const BUDDIES = [
    { id: 'buddy_3', name: 'Matti' },
    { id: 'buddy_1', name: 'Panda' },
    { id: 'buddy_2', name: 'P.P.' },
]

const BUDDY_ICONS = {
    buddy_1: pandaIcon,
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
    const icon = BUDDY_ICONS[buddyId]
    if (icon) {
        return (
            <img
                className="buddy-icon"
                src={icon}
                alt={BUDDIES.find(b => b.id === buddyId)?.name ?? ''}
                style={{ width: size, height: size }}
            />
        )
    }
    // Fallback: the top square of the figure (its head) for buddies without a dedicated icon
    const figure = BUDDY_FIGURES[buddyId]
    if (figure == null) return null
    return (
        <div
            className="buddy-icon buddy-icon--sprite"
            style={{
                width: size,
                height: size,
                backgroundImage: `url(${figure.src})`,
                backgroundSize: '100% auto',
                backgroundPosition: '0 0',
            }}
        />
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
