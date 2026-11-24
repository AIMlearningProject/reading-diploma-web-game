// The world map's HUD, drawn over the Phaser canvas.
//
// On a wide screen it is one panel on the desk beside the map sheet, at the
// place game/ui/worldMapLayout.js worked out (`panel`, in CSS pixels): the
// way back, the year's reading, where the pupil is, and the backpack. On a
// narrow screen there is no room beside the sheet, so only the way back and
// the reading count stay, as a group in the top left corner over the map.
//
// It reads ReadingState when it renders. Nothing on the world map changes the
// reading, and the scene hands over a new layout every time it starts, so the
// figures are current whenever the panel is on screen.

import ReadingState from '../../game/state.js'
import items from '../../game/data/items.js'
import { continentName } from '../../game/scenes/continentRegistry.js'
import { PANEL_DESIGN } from '../../game/ui/worldMapLayout.js'
import InkFilter from '../ink/InkFilter.jsx'
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
    // Type and spacing follow the panel's size against the one it was drawn at,
    // so a short screen fits it all and a big one does not leave it half empty.
    const k = Math.min(panel.width / PANEL_DESIGN.width, panel.height / PANEL_DESIGN.height)

    return (
        <aside
            className="wmh-panel ink-shape ink-drop"
            style={{ left: panel.x, top: panel.y, width: panel.width, height: panel.height, '--wmh-k': k }}
        >
            <InkFilter />
            <button type="button" className="wmh-back" onClick={onBack}>
                <span className="wmh-round ink-shape ink-drop"><BackArrow /></span>
                <span className="wmh-back-label">Matkapäiväkirjaan</span>
            </button>

            <ReadingCount />

            <section className="wmh-here ink-shape" aria-label="Olet täällä">
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

            <section className="wmh-bag" aria-label="Reppu">
                <h2 className="wmh-bag-title">Reppu</h2>
                <ul className="wmh-bag-items">
                    {items.map((item) => (
                        ReadingState.hasItem(item.id)
                            ? (
                                <li key={item.id} className="wmh-item ink-shape" title={item.name}>
                                    <img src={item.icon[96]} alt={item.name} />
                                </li>
                            )
                            : (
                                <li key={item.id} className="wmh-item wmh-item--missing ink-shape" aria-label="Ei vielä löydetty">
                                    <span aria-hidden="true">?</span>
                                </li>
                            )
                    ))}
                </ul>
            </section>
        </aside>
    )
}
