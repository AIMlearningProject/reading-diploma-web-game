// The buddy picker: the camp's beach before the tent is up, with the three
// buddies standing on the sand in front of the sea, each saying its name in a
// speech bubble over its head, drawn like the map's own (makeInkTooltip). It stands in the camp's own frame under the camp's sign
// (CampFrame), so the sign does not move when the camp takes its place.
//
// Each buddy idles a little: it breathes and now and then sways, with periods
// and phases drawn at random per visit, so the three never move in step.
// Pointing at a buddy makes it hop; pressing it picks it, and its bubble turns
// sun yellow. The actions (Tallenna, Peruuta) go in as children, under the
// frame where the camp has its invite button.
//
// Laid out in the camp scene's own stage units (1038 x 700, layout.json), so
// it scales with the frame as the camp's canvas does. The beach is the camp's
// day art; its sea is carried across the whole picture in land_full.png
// (build/camp/fill_sea.py), as the tent no longer covers the left side. The
// Matti and P.P. are the first-drawn portraits (buddyAvatar/classic, cut by
// build/camp/cut_classic_buddies.py), whose line is heavier; Panda is the
// redrawn one.

import { useState } from 'react'
import { BUDDIES } from '../BuddyAvatar.jsx'
import layout from '../../assets/camp/scene/layout.json'
import sky from '../../assets/camp/scene/day/sky.png'
import cloud1 from '../../assets/camp/scene/day/cloud_1.png'
import cloud2 from '../../assets/camp/scene/day/cloud_2.png'
import cloud3 from '../../assets/camp/scene/day/cloud_3.png'
import land from '../../assets/camp/scene/day/land_full.png'
import plant from '../../assets/camp/scene/day/plant.png'
import mattiFigure from '../../assets/buddyAvatar/classic/matti.png'
import pandaFigure from '../../assets/buddyAvatar/figures/panda.png'
import ppFigure from '../../assets/buddyAvatar/classic/pp.png'
import CampFrame from './CampFrame.jsx'
import './BuddyPicker.css'

// Where each buddy stands, in stage units: x is the centre, `bottom` the feet,
// `height` the portrait's height.
const SEATS = {
    buddy_3: { figure: mattiFigure, aspect: 462 / 779, x: 310, height: 330, bottom: 600 },
    buddy_1: { figure: pandaFigure, aspect: 479 / 618, x: 520, height: 235, bottom: 600 },
    buddy_2: { figure: ppFigure, aspect: 475 / 752, x: 760, height: 330, bottom: 600 },
}
// Stage units between the top of a buddy's head and the tip of its bubble's tail.
const BUBBLE_GAP = 14

// A stage-unit figure as CSS: the stage is a size container 1038 units across.
const u = (n) => `calc(100cqw * ${n} / 1038)`

const layer = (key, src, extra = {}) => {
    const { x, y, w } = layout[`day/${key}`]
    return <img src={src} alt="" className="bp-layer" style={{ left: u(x), top: u(y), width: u(w), ...extra }} />
}

const between = (low, high) => low + Math.random() * (high - low)

/** One buddy's idle motion with random periods, phases and sway side (keyframes in BuddyPicker.css). */
const idleTiming = () => ({
    breathe: { animation: `bp-breathe ${between(2.6, 3.8).toFixed(2)}s ease-in-out ${(-between(0, 4)).toFixed(2)}s infinite` },
    sway: { animation: `bp-sway-${Math.random() < 0.5 ? 'left' : 'right'} ${between(5, 9).toFixed(2)}s ease-in-out ${(-between(0, 9)).toFixed(2)}s infinite` }
})

export default function BuddyPicker({ selected, onSelect, children }) {
    // Drawn once per visit: the timing stays put while the pupil looks.
    const [idle] = useState(() => Object.fromEntries(BUDDIES.map(({ id }) => [id, idleTiming()])))

    return (
        <div className="camp-scene">
            <CampFrame names="Valitse kaveri leirille">
                <div className="bp-stage" role="radiogroup" aria-label="Valitse kaveri">
                    {layer('sky', sky)}
                    {layer('cloud_1', cloud1)}
                    {layer('cloud_2', cloud2)}
                    {layer('cloud_3', cloud3)}
                    {layer('land', land)}

                    {BUDDIES.map(({ id, name }) => {
                        const seat = SEATS[id]
                        const width = seat.height * seat.aspect
                        const isPicked = selected === id
                        return (
                            <div key={id} className="bp-seat">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isPicked}
                                    aria-label={name}
                                    className="bp-buddy"
                                    style={{ left: u(seat.x - width / 2), top: u(seat.bottom - seat.height), width: u(width), height: u(seat.height) }}
                                    onClick={() => onSelect(id)}
                                >
                                    <span className="bp-idle" style={idle[id].breathe}>
                                        <span className="bp-sway" style={idle[id].sway}>
                                            <img src={seat.figure} alt="" />
                                        </span>
                                    </span>
                                </button>
                                <span
                                    className={`bp-bubble ink-shape ink-shape--thin${isPicked ? ' bp-bubble--picked' : ''}`}
                                    style={{ left: u(seat.x), top: u(seat.bottom - seat.height - BUBBLE_GAP) }}
                                    aria-hidden="true"
                                >
                                    {name}
                                    {/* The tail: its fill covers the bubble's bottom line where they join. */}
                                    <svg className="bp-bubble-tail" viewBox="0 -4 24 18" aria-hidden="true">
                                        <path className="bp-bubble-tail-fill" d="M0 -4 H24 V0 L12 14 L0 0 Z" />
                                        <path className="bp-bubble-tail-line" d="M0 0 L12 14 L24 0" />
                                    </svg>
                                </span>
                            </div>
                        )
                    })}

                    {layer('plant', plant, { pointerEvents: 'none' })}
                </div>
            </CampFrame>
            <div className="camp-scene-footer">
                {children}
            </div>
        </div>
    )
}
