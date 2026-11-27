// The maps' HUD, drawn over the Phaser canvas: the world map's and every
// continent's.
//
// On a wide screen it is the pupil's backpack (Backpack.jsx), lying on the desk
// beside the map sheet in the area game/ui/mapLayout.js worked out (`panel`,
// in CSS pixels); its luggage tag is the way back. Anywhere narrower the bag
// peeks in at the bottom edge and opens over the map (BackpackDrawer.jsx), and
// the way back is a round button in the bottom left corner.
//
// The scene hands over everything the bag shows each time it lays itself out
// or the reading changes (window.setMapHud): `here` (the continent the
// notebook shows), `tag` ({ label, onPress }, the way back) and `action`
// ({ label, onPress, done }, the notebook's button). `shade` is set while a
// popup drawn on the canvas is open: the canvas shades the map, and the bag is
// darkened here to match and stops taking presses. A layer over the screen
// would shade the popup too, since the page lies above the whole canvas.

import InkFilter from '../ink/InkFilter.jsx'
import Backpack, { BackArrow } from './Backpack.jsx'
import { BAG_SIZE } from './BackpackArt.jsx'
import BackpackDrawer from './BackpackDrawer.jsx'
import './MapHud.css'

export default function MapHud({ panel, here, tag, action, shade = false }) {
    if (!panel) {
        return (
            <div className={`wmh-hud${shade ? ' is-shaded' : ''}`}>
                <InkFilter />
                <BackpackDrawer here={here} action={action} />
                {/* Bottom left: on a phone the thumb is at the bottom anyway. */}
                <div className="wmh-corner">
                    <button type="button" className="wmh-round ink-shape ink-drop" onClick={tag.onPress} aria-label={tag.label}>
                        <BackArrow />
                    </button>
                </div>
            </div>
        )
    }

    // The bag is drawn at BAG_SIZE and scaled whole into the area, centred. The
    // layout only hands over an area that holds it at BAG_MIN_SCALE or more.
    const k = Math.min(panel.width / BAG_SIZE.width, panel.height / BAG_SIZE.height)
    const left = panel.x + (panel.width - BAG_SIZE.width * k) / 2
    const top = panel.y + (panel.height - BAG_SIZE.height * k) / 2

    return (
        <div className={`wmh-hud${shade ? ' is-shaded' : ''}`}>
            <InkFilter />
            <Backpack
                scale={k}
                style={{ left, top, transform: `scale(${k})` }}
                here={here}
                tag={tag}
                action={action}
            />
        </div>
    )
}
