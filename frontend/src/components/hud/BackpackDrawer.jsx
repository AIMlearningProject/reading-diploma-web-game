// The backpack on a screen with no room beside the map (WorldMapHud.jsx). It
// lies below the bottom edge with its handle and the top of its flap showing
// (BAG_PEEK); pressing that lifts it up over the darkened map, at the same
// scale, so its lines and writing match the rest of the page. It is never drawn
// under BAG_MIN_SCALE: on a phone that makes it wider than the screen, so its
// sides are cut off, and it comes without its luggage tag, which would be cut
// off too. The way back is the round button in the corner instead.
//
// Closed by the close button, by pressing the darkened map, or by Esc. A
// screen too short for the open bag scrolls it.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BAG_MAX_SCALE, BAG_MIN_SCALE, BAG_PEEK, BAG_SIZE } from '../../game/ui/worldMapLayout.js'
import Backpack from './Backpack.jsx'
import { NOTE } from './BackpackArt.jsx'

// CSS pixels: the gap above the open bag, and the hint's least gap to the
// screen's right edge.
const OPEN_GAP = 12
const HINT_EDGE = 8

// The hint beside the handle, in the bag's units: a speech bubble like the
// map's own ("Klikkaa tutkiaksesi!"), its tail pointing left at the handle
// (whose outer edge is at x 302). One line where it fits, two on a phone.
const HINT = { tipX: 305, tipY: 30, left: 318, pad: 10, radius: 10, font: 14, lead: 17 }
const INK = '#3a2a10'
const PAPER = '#fdf8ec'
const NAVY = '#1e3a5f'

function bubblePath(x0, y0, w, h) {
    const { tipX, tipY, radius: r } = HINT
    const x1 = x0 + w
    const y1 = y0 + h
    return `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1}`
        + ` H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${tipY + 7} L${tipX} ${tipY} L${x0} ${tipY - 7}`
        + ` V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`
}

/**
 * Drawn in the bag's own units and ink filter (#wmh-ink, #wmh-dots from
 * BackpackArt), so it scales and wobbles with the bag and its line is no
 * thinner than the bag's. `maxRight` is the screen's right edge in bag units.
 */
function PeekHint({ scale, maxRight }) {
    const textRef = useRef(null)
    const [textWidth, setTextWidth] = useState(null)
    const [twoLines, setTwoLines] = useState(false)

    useLayoutEffect(() => {
        const width = textRef.current?.getBBox().width ?? 0
        if (!twoLines && HINT.left + width + 2 * HINT.pad > maxRight) {
            setTwoLines(true)
            return
        }
        setTextWidth(width)
    }, [twoLines, maxRight])

    const lines = twoLines ? ['Avaa reppu', 'tästä!'] : ['Avaa reppu tästä!']
    const height = HINT.lead * lines.length + 13
    const top = HINT.tipY - height / 2
    const width = (textWidth ?? 0) + 2 * HINT.pad

    return (
        <svg
            className="wmh-drawer-hint"
            viewBox={`0 0 ${BAG_SIZE.width} ${BAG_SIZE.height}`}
            width={BAG_SIZE.width}
            height={BAG_SIZE.height}
            style={{ transform: `scale(${scale})`, visibility: textWidth === null ? 'hidden' : 'visible' }}
            aria-hidden="true"
        >
            <path d={bubblePath(HINT.left, top, width, height)} fill="url(#wmh-dots)" transform="translate(4 5)" filter="url(#wmh-ink)" />
            <path d={bubblePath(HINT.left, top, width, height)} fill={PAPER} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" filter="url(#wmh-ink)" />
            <text
                ref={textRef}
                x={HINT.left + HINT.pad}
                y={top + 6 + HINT.font}
                fontFamily="Nunito, sans-serif"
                fontWeight="900"
                fontSize={HINT.font}
                fill={NAVY}
            >
                {lines.map((line, i) => (
                    <tspan key={line} x={HINT.left + HINT.pad} dy={i === 0 ? 0 : HINT.lead}>{line}</tspan>
                ))}
            </text>
        </svg>
    )
}

function useBoxSize(ref) {
    const [size, setSize] = useState(null)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [ref])
    return size
}

export default function BackpackDrawer({ onOpenContinent }) {
    const boxRef = useRef(null)
    const peekRef = useRef(null)
    const closeRef = useRef(null)
    const bagRef = useRef(null)
    const [open, setOpen] = useState(false)
    const wasOpen = useRef(false)
    const size = useBoxSize(boxRef)

    useEffect(() => {
        if (!open) return
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    // Focus follows the bag: into it when it opens, back to its handle when it closes.
    useEffect(() => {
        if (open) closeRef.current?.focus()
        else if (wasOpen.current) peekRef.current?.focus()
        wasOpen.current = open
    }, [open])

    let bag = null
    if (size) {
        // As large as the screen's height allows, as long as the notebook still
        // fits its width; never under BAG_MIN_SCALE, even if the bag's sides are cut.
        const fitHeight = (size.height - OPEN_GAP) / BAG_SIZE.height
        const fitNote = (size.width - 2 * OPEN_GAP) / NOTE.width
        const scale = Math.max(BAG_MIN_SCALE, Math.min(BAG_MAX_SCALE, fitHeight, fitNote))
        const width = BAG_SIZE.width * scale
        const height = BAG_SIZE.height * scale
        const openTop = Math.max(OPEN_GAP, size.height - height)
        bag = {
            scale, width, height, openTop,
            left: (size.width - width) / 2,
            // The screen's right edge, less the hint's gap, in the bag's units.
            maxRight: (size.width - (size.width - width) / 2 - HINT_EDGE) / scale,
            // How far down the closed bag lies from where it opens.
            drop: size.height - BAG_PEEK - openTop,
            room: Math.max(size.height, openTop + height + OPEN_GAP)
        }
    }

    // A press on the darkened map, outside the bag, closes it.
    const onShadePress = (event) => {
        if (open && !bagRef.current?.contains(event.target)) setOpen(false)
    }

    return (
        <div className={`wmh-drawer${open ? ' is-open' : ''}`} ref={boxRef}>
            {bag && (
                <div className="wmh-drawer-scroll" onClick={onShadePress}>
                    <div className="wmh-drawer-room" style={{ height: open ? bag.room : '100%' }}>
                        <div
                            ref={bagRef}
                            className="wmh-drawer-lift"
                            style={{
                                left: bag.left, top: bag.openTop, width: bag.width, height: bag.height,
                                transform: open ? 'none' : `translateY(${bag.drop}px)`
                            }}
                        >
                            <Backpack
                                id="wmh-drawer-bag"
                                scale={bag.scale}
                                style={{ left: 0, top: 0, transform: `scale(${bag.scale})` }}
                                onOpenContinent={onOpenContinent}
                                role={open ? 'dialog' : undefined}
                                aria-modal={open ? 'true' : undefined}
                                aria-label="Reppu"
                                {...(open ? {} : { inert: '', 'aria-hidden': 'true' })}
                            />
                            {!open && (
                                <PeekHint
                                    key={Math.round(bag.maxRight)}
                                    scale={bag.scale}
                                    maxRight={bag.maxRight}
                                />
                            )}
                            {!open && (
                                <button
                                    ref={peekRef}
                                    type="button"
                                    className="wmh-drawer-peek"
                                    style={{ height: BAG_PEEK }}
                                    onClick={() => setOpen(true)}
                                    aria-label="Avaa reppu"
                                    aria-expanded="false"
                                    aria-controls="wmh-drawer-bag"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {open && (
                <button
                    ref={closeRef}
                    type="button"
                    className="wmh-round wmh-drawer-close ink-shape ink-drop"
                    onClick={() => setOpen(false)}
                    aria-label="Sulje reppu"
                >
                    <svg className="wmh-arrow" viewBox="0 0 30 30" aria-hidden="true">
                        <path d="M8 8 L22 22 M22 8 L8 22" />
                    </svg>
                </button>
            )}
        </div>
    )
}
