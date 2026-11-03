import buddySpriteSheet from '../assets/buddyAvatar/diploma_buddies-Sheet.png'
import pandaIcon from '../assets/buddyAvatar/panda/panda_icon.png'
import './BuddyAvatar.css'

export const BUDDIES = [
    { id: 'buddy_1', name: 'Panda' },
    { id: 'buddy_2', name: 'P.P.' },
    { id: 'buddy_3', name: 'Matti' },
]

const BUDDY_ICONS = {
    buddy_1: pandaIcon,
}

// diploma_buddies-Sheet.png is 1339×1034 and its three figures have different
// widths (the cat's paw and Matti's hair share columns), so each buddy has its
// own bounding box instead of an equal third of the sheet.
const SHEET_W = 1339
const SHEET_H = 1034

const BUDDY_FRAMES = {
    buddy_1: { x: 436, y: 0, w: 473, h: 617 },
    buddy_2: { x: 915, y: 0, w: 424, h: 1021 },
    buddy_3: { x: 0, y: 0, w: 436, h: 1034 },
}

// Square head crops for the nav-bar icon of buddies without a dedicated icon
const BUDDY_HEADS = {
    buddy_2: { x: 915, y: 0, size: 424 },
    buddy_3: { x: 0, y: 0, size: 436 },
}

// Every buddy is drawn at one shared scale inside a frame as wide as the widest
// figure and as tall as the tallest, standing on the frame's bottom edge
const FRAME_W = Math.max(...Object.values(BUDDY_FRAMES).map(f => f.w))
const FRAME_H = Math.max(...Object.values(BUDDY_FRAMES).map(f => f.h))
const FRAME_ASPECT = FRAME_H / FRAME_W

function sheetCrop(x, y, scale) {
    return {
        backgroundImage: `url(${buddySpriteSheet})`,
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
        backgroundPosition: `${-x * scale}px ${-y * scale}px`,
    }
}

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
    // Fallback: head crop from the sprite sheet for buddies without a dedicated icon
    const head = BUDDY_HEADS[buddyId]
    if (head == null) return null
    return (
        <div
            className="buddy-icon buddy-icon--sprite"
            style={{
                width: size,
                height: size,
                ...sheetCrop(head.x, head.y, size / head.size),
            }}
        />
    )
}

export function BuddySprite({ buddyId, size = 120 }) {
    const frame = BUDDY_FRAMES[buddyId]
    const h = Math.round(size * FRAME_ASPECT)
    if (frame == null) {
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
    return (
        <div className="buddy-sprite" style={{ width: size, height: h }}>
            <div
                className="buddy-sprite__figure"
                style={{
                    width: frame.w * scale,
                    height: frame.h * scale,
                    ...sheetCrop(frame.x, frame.y, scale),
                }}
            />
        </div>
    )
}
