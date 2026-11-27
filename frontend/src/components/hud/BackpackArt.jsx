// The backpack drawn behind the maps' HUD (MapHud.jsx), in a 502 x 676
// box. Every shape goes through the one ink filter below, and an outline is drawn
// after whatever lies inside it, so no fill or piping covers half of the line.
//
// The colours are the drawing's own, like the map art's: the bag is not part of
// the token set. ART.paper and ART.ink match --book-paper and --ink-900.

import { BAG_SIZE } from '../../game/ui/mapLayout.js'

export { BAG_SIZE }

// The notebook page: where it sits, and the grid its writing and ruled lines share.
export const NOTE = { x: 70, y: 200, width: 362, height: 390, tilt: -1.5 }
export const NOTE_TEXT = { x: 96, y: 236, scale: 0.82, firstRule: 38, step: 34 }

// Each item's hover area: its own compartment of the front pocket (the pocket's
// edges and the three seams drawn on it below), from the item's top down to the
// pocket's bottom, so pointing at the pocket under an item counts too.
const POCKET_SEAMS = [56, 153, 251, 349, 446]
export const ITEM_AREAS = POCKET_SEAMS.slice(0, -1).map((left, i) => ({
    left, width: POCKET_SEAMS[i + 1] - left, top: 500, height: 106
}))

// Where the tag hangs, for the button laid over it.
export const TAG = { x: 264, y: 27, angle: 22, hole: { x: 26, y: 39 }, width: 229, top: 12, bottom: 66 }

const ART = {
    ink: '#3a2a10',
    paper: '#fdf8ec',
    fabric: '#46628a',
    fabricDark: '#34496a',
    leather: '#a65a32',
    tan: '#e3a465',
    brass: '#e0bc64',
    rule: '#b6c4cb',
    margin: '#dba69a',
    hatch: '#142846'
}

const BODY = 'M40 636 V214 C40 100 128 52 251 52 C374 52 462 100 462 214 V636 Q462 664 434 664 H68 Q40 664 40 636 Z'
const FLAP = 'M50 184 C50 106 132 66 251 66 C370 66 452 106 452 184 C452 202 440 212 418 212 H84 C62 212 50 202 50 184 Z'
const POCKET = 'M56 572 Q56 560 68 560 H434 Q446 560 446 572 V588 Q446 606 426 606 H76 Q56 606 56 588 Z'
const STRAP_L = 'M74 106 C6 150 -10 260 -6 380 C-4 484 4 576 26 630 L54 612 C36 566 28 476 26 380 C26 262 42 170 98 134 Z'
const STRAP_R = 'M428 106 C496 150 512 260 508 380 C506 484 498 576 476 630 L448 612 C466 566 474 476 476 380 C476 262 460 170 404 134 Z'
const HANDLE = 'M200 76 C200 -14 302 -14 302 76 L286 76 C286 6 216 6 216 76 Z'
const TAG_SHAPE = `M26 ${TAG.top} H${TAG.width} V${TAG.bottom} H26 L6 39 Z`

// Where each item stands in the front pocket, in items.js order.
const POCKET_SLOTS = [{ x: 105, tilt: -8 }, { x: 202, tilt: 5 }, { x: 300, tilt: -4 }, { x: 397, tilt: 9 }]

// The canvas's weave: a light diagonal hatch on every blue part, none on the
// leather or the paper. Its strength, as the opacity of the hatch lines.
export const HATCH_STRENGTH = 0.24

// The ink filter cuts alpha to on or off, so the hatch is an opaque colour
// mixed in advance over each blue it lies on.
function mix(base, over, amount) {
    const ch = (hex, i) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    return '#' + [0, 1, 2].map((i) => Math.round(ch(base, i) * (1 - amount) + ch(over, i) * amount)
        .toString(16).padStart(2, '0')).join('')
}

const INK = 'url(#wmh-ink)'
const DROP = 'url(#wmh-dots)'

// An outlined shape, with the house line.
function Outlined({ d, fill = 'none', width = 7, ...rest }) {
    return (
        <path
            d={d} fill={fill} stroke={ART.ink} strokeWidth={width}
            strokeLinejoin="round" strokeLinecap="round" filter={INK} {...rest}
        />
    )
}

function Line({ d, color = ART.ink, width = 4, dashed = false, ...rest }) {
    return (
        <path
            d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
            strokeDasharray={dashed ? '8 7' : undefined} filter={INK} {...rest}
        />
    )
}

const Stitch = ({ d }) => <Line d={d} color={ART.tan} width={3} dashed />
// A canvas part: the fill, the hatch clipped to it, then the outline on top,
// so the hatch never covers half of the line.
function Fabric({ id, d, fill }) {
    return (
        <>
            <clipPath id={`wmh-clip-${id}`}><path d={d} /></clipPath>
            <path d={d} fill={fill} filter={INK} />
            <path d={d} fill={`url(#wmh-hatch-${fill === ART.fabric ? 'fabric' : 'fabricDark'})`} clipPath={`url(#wmh-clip-${id})`} filter={INK} />
            <Outlined d={d} />
        </>
    )
}

const Drop = ({ d, dx = 6, dy = 7 }) => <path d={d} fill={DROP} transform={`translate(${dx} ${dy})`} filter={INK} />

export default function BackpackArt({ items, withTag = true }) {
    const rules = []
    for (let n = -1; n < 10; n++) {
        const y = NOTE_TEXT.y + (NOTE_TEXT.firstRule + NOTE_TEXT.step * n) * NOTE_TEXT.scale
        if (y > NOTE.y + 14 && y < NOTE.y + NOTE.height - 2) rules.push(y)
    }
    // The pivot the approved drawing turned the page about.
    const noteCentre = '251 420'

    return (
        <svg className="wmh-bag-art" viewBox={`0 0 ${BAG_SIZE.width} ${BAG_SIZE.height}`} aria-hidden="true" colorInterpolationFilters="sRGB">
            <defs>
                {/* In the drawing's own units, so a thin or flat shape is never clipped. */}
                <filter id="wmh-ink" filterUnits="userSpaceOnUse" x="-60" y="-60" width="640" height="820">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="n" />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
                    <feComponentTransfer><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
                </filter>
                <pattern id="wmh-dots" width="3" height="3" patternUnits="userSpaceOnUse">
                    <rect width="1.5" height="1.5" fill={ART.ink} />
                    <rect x="1.5" y="1.5" width="1.5" height="1.5" fill={ART.ink} />
                </pattern>
                <clipPath id="wmh-body-clip"><path d={BODY} /></clipPath>
                {[['fabric', ART.fabric], ['fabricDark', ART.fabricDark]].map(([name, base]) => (
                    <pattern key={name} id={`wmh-hatch-${name}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                        <line x1="0" y1="0" x2="0" y2="9" stroke={mix(base, ART.hatch, HATCH_STRENGTH)} strokeWidth="2.6" />
                    </pattern>
                ))}
            </defs>

            {/* Shoulder straps, behind the body. */}
            <Drop d={STRAP_R} />
            <Fabric id="strap-l" d={STRAP_L} fill={ART.fabricDark} />
            <Fabric id="strap-r" d={STRAP_R} fill={ART.fabricDark} />

            {/* The tag's string rings the handle: back half behind it, front half over it. */}
            {withTag && <Line d="M270 1 A7 16 0 0 0 270 33" transform="rotate(20 270 17)" />}
            <Outlined d={HANDLE} fill={ART.leather} width={6} />
            {withTag && <Line d="M270 1 A7 16 0 0 1 270 33" transform="rotate(20 270 17)" />}

            {/* Body: the fabric, the leather base, then the outline over both. */}
            <Drop d={BODY} dx={7} dy={8} />
            <path d={BODY} fill={ART.fabric} filter={INK} />
            <g filter={INK}>
                <g clipPath="url(#wmh-body-clip)">
                    <rect x="0" y="0" width={BAG_SIZE.width} height={BAG_SIZE.height} fill="url(#wmh-hatch-fabric)" />
                    <path d="M30 622 C140 614 362 614 472 622 V680 H30 Z" fill={ART.leather} />
                </g>
            </g>
            <Line d="M330 300 C344 330 346 362 340 392" width={3.5} opacity={0.45} />
            <Outlined d="M42 622 C140 614 362 614 460 622" />
            <Stitch d="M54 638 C150 631 352 631 448 638" />
            <Outlined d={BODY} />

            {/* Side pockets. */}
            <Fabric id="side-l" d="M42 432 C14 436 8 480 12 566 C14 612 26 630 44 632 Z" fill={ART.fabricDark} />
            <Stitch d="M30 448 C24 450 20 456 20 466" />
            <Fabric id="side-r" d="M460 432 C488 436 494 480 490 566 C488 612 476 630 458 632 Z" fill={ART.fabricDark} />
            <Stitch d="M472 448 C478 450 482 456 482 466" />

            {/* The notebook, slid in under the flap and into the front pocket. Its
                lines stay lighter than the writing on it. */}
            <g transform={`rotate(${NOTE.tilt} ${noteCentre})`}>
                <rect x={NOTE.x + 6} y={NOTE.y + 6} width={NOTE.width} height={NOTE.height} rx="10" fill={DROP} filter={INK} />
                <rect
                    x={NOTE.x} y={NOTE.y} width={NOTE.width} height={NOTE.height} rx="10"
                    fill={ART.paper} stroke={ART.ink} strokeWidth="7" filter={INK}
                />
                <g stroke={ART.rule} strokeWidth="2" filter={INK}>
                    {rules.map((y) => <line key={y} x1={NOTE.x + 6} y1={y} x2={NOTE.x + NOTE.width - 6} y2={y} />)}
                </g>
                <line x1={NOTE.x + 18} y1={NOTE.y + 4} x2={NOTE.x + 18} y2={NOTE.y + NOTE.height - 4} stroke={ART.margin} strokeWidth="2" filter={INK} />
            </g>

            {/* The flap, closed over the top, with piping and a buckled tab that
                holds the notebook in. */}
            <Drop d={FLAP} dx={5} dy={6} />
            <Fabric id="flap" d={FLAP} fill={ART.fabricDark} />
            <Line d="M62 186 C62 199 72 204 88 204 H414 C430 204 440 199 440 186" color={ART.tan} width={6} />
            <Stitch d="M90 174 C90 124 150 94 251 90 C352 94 412 124 412 174" />
            <Outlined d="M230 168 H272 V226 Q272 242 251 242 Q230 242 230 226 Z" fill={ART.leather} width={6} />
            <Outlined d="M229 194 H273 Q280 194 280 201 V215 Q280 222 273 222 H229 Q222 222 222 215 V201 Q222 194 229 194 Z" fill={ART.brass} width={5} />
            <Outlined d="M236 202 H266 Q269 202 269 205 V211 Q269 214 266 214 H236 Q233 214 233 211 V205 Q233 202 236 202 Z" fill={ART.leather} width={3.5} />

            {/* Front pocket: each found item stands in its own pocket, lower half hidden. */}
            {items.map((item, i) => item && (
                <image
                    key={item.id} href={item.icon[96]}
                    x={POCKET_SLOTS[i].x - 46} y="500" width="92" height="92"
                    transform={`rotate(${POCKET_SLOTS[i].tilt} ${POCKET_SLOTS[i].x} 546)`}
                />
            ))}
            <Drop d={POCKET} />
            <path d={POCKET} fill={ART.fabric} filter={INK} />
            <clipPath id="wmh-clip-pocket"><path d={POCKET} /></clipPath>
            <path d={POCKET} fill="url(#wmh-hatch-fabric)" clipPath="url(#wmh-clip-pocket)" filter={INK} />
            <Line d="M62 568 Q62 566 70 566 H432 Q440 566 440 568" color={ART.tan} width={9} />
            <Stitch d="M72 584 H430" />
            <Line d={POCKET_SEAMS.slice(1, -1).map((x) => `M${x} 570 V604`).join(' ')} width={4.5} />
            <Outlined d={POCKET} />

            {/* The tag, hanging from the handle by its string. A narrow screen
                has no room for it beside the bag, so the bag comes without it. */}
            {withTag && (
                <>
                    <Line d="M265 32 C268 46 278 60 290 66" />
                    <g transform={`translate(${TAG.x} ${TAG.y}) rotate(${TAG.angle} ${TAG.hole.x} ${TAG.hole.y})`}>
                        <path d={TAG_SHAPE} fill={DROP} transform="translate(4 5)" filter={INK} />
                        <Outlined d={TAG_SHAPE} fill={ART.paper} width={6} />
                        <circle cx={TAG.hole.x} cy={TAG.hole.y} r="6" fill="none" stroke={ART.ink} strokeWidth="4" filter={INK} />
                    </g>
                </>
            )}
        </svg>
    )
}
