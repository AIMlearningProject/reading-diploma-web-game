// Plays a mini-game granted by a puzzle scene, on the student dashboard.
//
// A separate window from MinigameModal, which still runs the continent tile
// puzzles: these games own their own loop and their own score, so the shared
// stopwatch in that modal does not apply. The surface follows the puzzle-scene
// design — parchment, line-300 frames, brass only as a fill.

import MiniGameCanvas from './MiniGameCanvas.jsx'
import './SceneGameModal.css'

export default function SceneGameModal({ game, onClose }) {
    if (!game?.module) return null

    return (
        <div className="sg-scrim" role="dialog" aria-modal="true" aria-label={game.name}>
            <div className="sg-window">
                <button className="sg-close" type="button" aria-label="Sulje peli" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6 18 18M18 6 6 18" />
                    </svg>
                </button>
                <MiniGameCanvas game={game.module} name={game.name} onClose={onClose} />
            </div>
        </div>
    )
}
