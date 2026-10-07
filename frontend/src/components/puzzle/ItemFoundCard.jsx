// The moment an item drops into the backpack, halfway through a continent.
//
// Deliberately small: it is a find, not a ceremony — the continent's own
// celebration still belongs to finishing it. Same surface as the puzzle panel
// so the two read as one thing.

import { itemById } from '../../game/data/items.js'
import './ItemFoundCard.css'

export default function ItemFoundCard({ itemId, onClose }) {
    const item = itemById[itemId]
    if (!item) return null

    return (
        <div className="if-scrim" role="dialog" aria-modal="true" aria-label="Löysit esineen">
            <div className="if-card">
                <p className="if-kicker">LÖYSIT ESINEEN</p>

                <div className="if-row">
                    <span className="if-disc">
                        <svg
                            width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                        >
                            {item.icon.map((d) => <path key={d} d={d} />)}
                        </svg>
                    </span>
                    <div className="if-text">
                        <h2 className="if-name">{item.name}</h2>
                        <p className="if-desc">{item.desc}</p>
                    </div>
                </div>

                <p className="if-found">{item.found}</p>
                <p className="if-note">Se odottaa repussasi. Jollakin toisella mantereella siitä on apua.</p>

                <button className="if-button" type="button" onClick={onClose}>
                    Laita reppuun
                </button>
            </div>
        </div>
    )
}
