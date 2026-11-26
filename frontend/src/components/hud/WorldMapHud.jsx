// The world map's HUD, drawn over the Phaser canvas.
//
// On a wide screen it is the pupil's backpack (Backpack.jsx), lying on the desk
// beside the map sheet in the area game/ui/worldMapLayout.js worked out (`panel`,
// in CSS pixels); its luggage tag is the way back. Anywhere narrower the bag
// peeks in at the bottom edge and opens over the map (BackpackDrawer.jsx), and
// the way back is a round button in the bottom left corner.
//
// The scene hands over a new layout every time it starts, and nothing on the
// world map changes the reading, so the bag is current whenever it is on screen.

import InkFilter from '../ink/InkFilter.jsx'
import Backpack, { BackArrow } from './Backpack.jsx'
import { BAG_SIZE } from './BackpackArt.jsx'
import BackpackDrawer from './BackpackDrawer.jsx'
import './WorldMapHud.css'

export default function WorldMapHud({ panel, onBack, onOpenContinent }) {
    if (!panel) {
        return (
            <>
                <InkFilter />
                <BackpackDrawer onOpenContinent={onOpenContinent} />
                {/* Bottom left: on a phone the thumb is at the bottom anyway. */}
                <div className="wmh-corner">
                    <button type="button" className="wmh-round ink-shape ink-drop" onClick={onBack} aria-label="Takaisin leiriin">
                        <BackArrow />
                    </button>
                </div>
            </>
        )
    }

    // The bag is drawn at BAG_SIZE and scaled whole into the area, centred. The
    // layout only hands over an area that holds it at BAG_MIN_SCALE or more.
    const k = Math.min(panel.width / BAG_SIZE.width, panel.height / BAG_SIZE.height)
    const left = panel.x + (panel.width - BAG_SIZE.width * k) / 2
    const top = panel.y + (panel.height - BAG_SIZE.height * k) / 2

    return (
        <>
            <InkFilter />
            <Backpack
                scale={k}
                style={{ left, top, transform: `scale(${k})` }}
                onBack={onBack}
                onOpenContinent={onOpenContinent}
            />
        </>
    )
}
