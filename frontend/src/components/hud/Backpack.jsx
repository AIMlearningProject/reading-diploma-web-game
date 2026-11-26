// The pupil's backpack on the world map: BackpackArt's drawing with the parts
// that can be read or pressed laid over it. The way back is the luggage tag on
// its handle (when it has one), the year's reading and where the pupil is are
// written in the notebook tucked under its flap, and the found items stand in
// its front pocket; pointing at one, or focusing it, shows a note with its name
// and what it does.
//
// It is laid out in the drawing's own BAG_SIZE units and drawn at `scale`; where
// it sits is the caller's (WorldMapHud.jsx: beside the map, or peeking in at the
// bottom edge). It reads ReadingState when it renders.

import ReadingState from '../../game/state.js'
import items from '../../game/data/items.js'
import { continentName } from '../../game/scenes/continentRegistry.js'
import { BAG_MIN_SCALE } from '../../game/ui/worldMapLayout.js'
import BackpackArt, { BAG_SIZE, ITEM_AREAS, NOTE_TEXT, TAG } from './BackpackArt.jsx'

export function BackArrow() {
    return (
        <svg className="wmh-arrow" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M17 6 L8 15 L17 24 M9 15 H24" />
        </svg>
    )
}

function ReadingCount() {
    const read = ReadingState.booksRead
    const target = ReadingState.targetBooks
    return (
        <div className="wmh-count">
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
                style={{ '--wmh-read': `${Math.min(100, (100 * read) / target)}%` }}
            >
                {/* One tick per continent. */}
                <span className="wmh-track-ticks" aria-hidden="true">
                    {ReadingState.mapOrder.map((key) => <i key={key} />)}
                </span>
            </div>
        </div>
    )
}

/**
 * `onBack` given: the bag carries its luggage tag, which leads back to camp.
 * `style` places the bag; its transform must scale it by `scale`.
 * Any other prop (id, inert, aria-*) goes on the bag's element.
 */
export default function Backpack({ scale, style, onBack = null, onOpenContinent, className = '', ...rest }) {
    if (import.meta.env.DEV && scale < BAG_MIN_SCALE - 1e-6) {
        console.error(`Backpack drawn at ${scale.toFixed(3)}, under BAG_MIN_SCALE (${BAG_MIN_SCALE}): its lines and writing come out thinner than the page's`)
    }

    const current = ReadingState.getCurrentContinent()
    const level = ReadingState.mapOrder.indexOf(current) + 1
    const nodes = ReadingState.nodesFor(current)
    const nodesRead = nodes.filter((node) => node.progress >= 100).length
    // An item not found yet leaves its pocket empty.
    const found = items.map((item) => (ReadingState.hasItem(item.id) ? item : null))
    const foundNames = found.filter(Boolean).map((item) => item.name)

    return (
        <aside
            className={`wmh-bag ${className}`.trim()}
            style={{ width: BAG_SIZE.width, height: BAG_SIZE.height, ...style }}
            {...rest}
        >
            <BackpackArt items={found} withTag={!!onBack} />

            {onBack && (
                <button
                    type="button" className="wmh-tag" onClick={onBack}
                    style={{
                        left: TAG.x, top: TAG.y + TAG.top, width: TAG.width, height: TAG.bottom - TAG.top,
                        transformOrigin: `${TAG.hole.x}px ${TAG.hole.y - TAG.top}px`, transform: `rotate(${TAG.angle}deg)`
                    }}
                >
                    <BackArrow />
                    Takaisin leiriin
                </button>
            )}

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

            {/* Each found item's compartment of the pocket, item included, with the
                note it shows. Laid after the notebook, so a note opens over the
                page. The two outer items open theirs inwards, so no note runs off
                the bag. */}
            {found.map((item, i) => item && (
                <div
                    key={item.id}
                    className={`wmh-item${i === 0 ? ' wmh-item--first' : ''}${i === found.length - 1 ? ' wmh-item--last' : ''}`}
                    tabIndex={0}
                    aria-label={item.name}
                    aria-describedby={`wmh-item-note-${item.id}`}
                    style={ITEM_AREAS[i]}
                >
                    <span id={`wmh-item-note-${item.id}`} className="wmh-item-note ink-shape ink-shape--thin" role="tooltip">
                        <strong className="wmh-item-name">{item.name}</strong>
                        {item.desc}
                    </span>
                </div>
            ))}

            <p className="wmh-sr-only">
                Reppu: {foundNames.length > 0 ? foundNames.join(', ') : 'ei vielä tavaroita'}
            </p>
        </aside>
    )
}
