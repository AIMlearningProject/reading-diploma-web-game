// The world map's HUD, drawn over the Phaser canvas.
//
// On a wide screen it is the pupil's backpack, lying on the desk beside the map
// sheet in the area game/ui/worldMapLayout.js worked out (`panel`, in CSS
// pixels). The way back is the luggage tag on its handle, the year's reading
// and where the pupil is are written in the notebook tucked under its flap, and
// the found items stand in its front pocket. On a narrow screen there is no
// room beside the sheet, so only the way back and the reading count stay, as a
// group in the bottom left corner over the map.
//
// It reads ReadingState when it renders. Nothing on the world map changes the
// reading, and the scene hands over a new layout every time it starts, so the
// figures are current whenever the panel is on screen.

import ReadingState from '../../game/state.js'
import items from '../../game/data/items.js'
import { continentName } from '../../game/scenes/continentRegistry.js'
import InkFilter from '../ink/InkFilter.jsx'
import BackpackArt, { BAG_SIZE, NOTE_TEXT, TAG } from './BackpackArt.jsx'
import './WorldMapHud.css'

function BackArrow() {
    return (
        <svg className="wmh-arrow" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M17 6 L8 15 L17 24 M9 15 H24" />
        </svg>
    )
}

function ReadingCount({ compact = false }) {
    const read = ReadingState.booksRead
    const target = ReadingState.targetBooks
    return (
        <div className={compact ? 'wmh-count wmh-count--compact' : 'wmh-count'}>
            <p className="wmh-count-text">
                <strong>{read} / {target}</strong> kirjaa luettu
            </p>
            <div
                className="wmh-track ink-shape"
                role="progressbar"
                aria-label="Luetut kirjat"
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={read}
            >
                <span className="wmh-track-fill" style={{ width: `${(100 * read) / target}%` }} />
                {/* One tick per continent. */}
                <span className="wmh-track-ticks" aria-hidden="true">
                    {ReadingState.mapOrder.map((key) => <i key={key} />)}
                </span>
            </div>
        </div>
    )
}

export default function WorldMapHud({ panel, onBack, onOpenContinent }) {
    if (!panel) {
        return (
            <div className="wmh-corner">
                <InkFilter />
                <button type="button" className="wmh-round ink-shape ink-drop" onClick={onBack} aria-label="Takaisin matkapäiväkirjaan">
                    <BackArrow />
                </button>
                <div className="wmh-corner-count ink-shape">
                    <ReadingCount compact />
                </div>
            </div>
        )
    }

    const current = ReadingState.getCurrentContinent()
    const level = ReadingState.mapOrder.indexOf(current) + 1
    const nodes = ReadingState.nodesFor(current)
    const nodesRead = nodes.filter((node) => node.progress >= 100).length
    // An item not found yet leaves its pocket empty.
    const found = items.map((item) => (ReadingState.hasItem(item.id) ? item : null))
    const foundNames = found.filter(Boolean).map((item) => item.name)

    // The bag is drawn at BAG_SIZE and scaled whole into the area, centred.
    const k = Math.min(panel.width / BAG_SIZE.width, panel.height / BAG_SIZE.height)
    const left = panel.x + (panel.width - BAG_SIZE.width * k) / 2
    const top = panel.y + (panel.height - BAG_SIZE.height * k) / 2

    return (
        <aside
            className="wmh-bag"
            style={{ left, top, width: BAG_SIZE.width, height: BAG_SIZE.height, transform: `scale(${k})` }}
        >
            <InkFilter />
            <BackpackArt items={found} />

            <button
                type="button" className="wmh-tag" onClick={onBack}
                style={{
                    left: TAG.x, top: TAG.y + TAG.top, width: TAG.width, height: TAG.bottom - TAG.top,
                    transformOrigin: `${TAG.hole.x}px ${TAG.hole.y - TAG.top}px`, transform: `rotate(${TAG.angle}deg)`
                }}
            >
                <BackArrow />
                Matkapäiväkirjaan
            </button>

            <section
                className="wmh-note" aria-label="Muistikirja"
                style={{ left: NOTE_TEXT.x, top: NOTE_TEXT.y, transform: `rotate(-1.5deg) scale(${NOTE_TEXT.scale})` }}
            >
                <ReadingCount />
                <p className="wmh-here-where">Olet täällä</p>
                <div className="wmh-here-row">
                    <span className="wmh-marker ink-shape ink-shape--round">{level}</span>
                    <div>
                        <h2 className="wmh-here-name">{continentName(current)}</h2>
                        <p className="wmh-here-genre">{ReadingState.genreFor(current).label}</p>
                    </div>
                </div>
                <p className="wmh-here-read">{nodesRead} / {nodes.length} kirjaa luettu</p>
                <button type="button" className="wmh-go ink-shape ink-drop" onClick={() => onOpenContinent(current)}>
                    Jatka matkaa
                </button>
            </section>

            <p className="wmh-sr-only">
                Reppu: {foundNames.length > 0 ? foundNames.join(', ') : 'ei vielä tavaroita'}
            </p>
        </aside>
    )
}
