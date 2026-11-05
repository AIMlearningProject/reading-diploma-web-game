// Plays a mini-game granted by a puzzle scene, on the student dashboard.
//
// A separate window from MinigameModal, which still runs the continent tile
// puzzles: these games own their own loop and their own score, so the shared
// stopwatch in that modal does not apply. The window is drawn in ink like the
// puzzle scene (ink.css); MiniGameCanvas mounts the filter it needs.

import closeIcon from '../../assets/icons/close_20.png'
import InkIcon from '../ink/InkIcon.jsx'
import MiniGameCanvas from './MiniGameCanvas.jsx'
import './SceneGameModal.css'

export default function SceneGameModal({ game, buddy, onClose }) {
    if (!game?.module) return null

    return (
        <div className="sg-scrim" role="dialog" aria-modal="true" aria-label={game.name}>
            <div className="sg-window ink-shape ink-drop">
                <button className="sg-close ink-shape ink-shape--round ink-shape--thin" type="button" aria-label="Sulje peli" onClick={onClose}>
                    <InkIcon src={closeIcon} size={20} />
                </button>
                <MiniGameCanvas game={game.module} name={game.name} buddy={buddy} onClose={onClose} />
            </div>
        </div>
    )
}
