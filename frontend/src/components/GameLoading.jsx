// The paper sheet shown over the game while it loads, so the pupil sees that
// something is happening rather than a black canvas. PhaserGame.jsx decides
// when: while the progress loads from the backend, and while a scene loads its
// pictures (the world map, or a continent visited for the first time).
//
// The ring carries its own ink filter inside the SVG instead of the CSS
// `filter: url(#ink-hand-round)` the other ink shapes use: iOS dropped the CSS
// filter from the turning element and drew a plain circle. The numbers match
// #ink-hand-round in InkFilter.jsx.

import './GameLoading.css'

// Three quarters of the ring is drawn; the open quarter shows the turn.
const RADIUS = 25
const AROUND = 2 * Math.PI * RADIUS

export default function GameLoading() {
    return (
        <div className="game-loading" role="status">
            <svg className="game-loading-ring" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                <filter id="game-loading-ink" x="-30%" y="-30%" width="160%" height="160%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
                    <feComponentTransfer>
                        <feFuncA type="discrete" tableValues="0 1" />
                    </feComponentTransfer>
                </filter>
                <circle
                    className="game-loading-arc"
                    cx="32"
                    cy="32"
                    r={RADIUS}
                    strokeDasharray={`${AROUND * 0.75} ${AROUND * 0.25}`}
                    filter="url(#game-loading-ink)"
                />
            </svg>
            {/* Finnish, pupil-facing. */}
            <p className="game-loading-text">Ladataan…</p>
        </div>
    )
}
