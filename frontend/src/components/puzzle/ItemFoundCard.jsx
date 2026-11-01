// The moment an item drops into the backpack, halfway through a continent.
//
// One flat paper sheet: a large round spot for the item's picture, its name,
// one or two sentences about the find, and one button. The picture spot shows
// the line icon until the hand-drawn item art replaces it.

import { itemById } from '../../game/data/items.js'
import paperGrainUrl from '../../assets/minigames/paper_grain.jpg'
import './ItemFoundCard.css'

export default function ItemFoundCard({ itemId, onClose }) {
    const item = itemById[itemId]
    if (!item) return null

    return (
        <div className="if-scrim" role="dialog" aria-modal="true" aria-label="Löysit esineen">
            <div className="if-card">
                {/* Inline because a CSS url() into src/assets does not resolve. */}
                <div className="if-grain" style={{ backgroundImage: `url(${paperGrainUrl})` }} aria-hidden="true" />

                <p className="if-kicker">LÖYSIT ESINEEN</p>
                <span className="if-picture">
                    <svg
                        width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                    >
                        {item.icon.map((d) => <path key={d} d={d} />)}
                    </svg>
                </span>
                <h2 className="if-name">{item.name}</h2>
                <p className="if-found">{item.found}</p>

                <button className="if-button" type="button" onClick={onClose}>
                    Laita reppuun
                </button>
            </div>
        </div>
    )
}
