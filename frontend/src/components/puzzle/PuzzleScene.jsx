// The puzzle scene panel: a story over the continent map, an item picked out of
// the backpack, and a mini-game as the reward for picking the right one.
//
// Picture-book style: one flat paper sheet with the mini-games' paper grain,
// soft colour fills, no outlines and no shadows, and as little text as the
// story allows. The 1280x800 frame scales to the viewport rather than
// reflowing. Page CSS is global, so every class here is prefixed `ps-`.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SceneIllustration from './SceneIllustration.jsx'
import allItems from '../../game/data/items.js'
import { miniGameById } from '../../game/data/miniGames.js'
import paperGrainUrl from '../../assets/minigames/paper_grain.jpg'
import './PuzzleScene.css'

function Icon({ paths, size }) {
    return (
        <svg
            className="ps-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths.map((d) => <path key={d} d={d} />)}
        </svg>
    )
}

// Game names are stored in capitals for the dashboard tiles; the card reads
// them as an ordinary name.
const asName = (name) => name.charAt(0) + name.slice(1).toLowerCase()

export default function PuzzleScene({
    scene,
    inventory = [],
    alreadySolved = false,
    onSolved,
    onClose,
    onGoToDashboard
}) {
    const [picked, setPicked] = useState(alreadySolved ? scene.correctItem : null)
    const [feedback, setFeedback] = useState(alreadySolved ? 'solved' : 'none')
    const [tried, setTried] = useState([])
    const frameRef = useRef(null)
    const grantedRef = useRef(alreadySolved)

    const isSolved = feedback === 'solved'
    const owned = new Set(inventory.map((item) => item.id))
    const hasAnswer = owned.has(scene.correctItem)
    const pickedItem = inventory.find((item) => item.id === picked) ?? null
    const game = miniGameById(scene.reward.gameId)

    // The 1280x800 frame is scaled to the viewport, never reflowed.
    useLayoutEffect(() => {
        const fit = () => {
            const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800, 1)
            frameRef.current?.style.setProperty('--ps-scale', String(scale))
        }
        fit()
        window.addEventListener('resize', fit)
        return () => window.removeEventListener('resize', fit)
    }, [])

    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const pick = (id) => {
        if (isSolved) return
        setPicked(id)
        setFeedback('none')
    }

    const use = () => {
        if (isSolved || !picked) return
        if (picked === scene.correctItem) {
            setFeedback('solved')
            if (!grantedRef.current) {
                grantedRef.current = true
                onSolved?.(scene.reward.gameId)
            }
            return
        }
        setFeedback('wrong')
        setTried((previous) => (previous.includes(picked) ? previous : [...previous, picked]))
    }

    const isUseDisabled = isSolved || !picked || feedback === 'wrong'

    return (
        <div className="ps-scrim" role="dialog" aria-modal="true" aria-label={scene.title}>
            <div className="ps-frame" ref={frameRef}>
                <div className="ps-panel">
                    {/* Inline because a CSS url() into src/assets does not resolve. */}
                    <div className="ps-grain" style={{ backgroundImage: `url(${paperGrainUrl})` }} aria-hidden="true" />

                    <div className="ps-art-box">
                        <SceneIllustration sceneId={scene.id} solved={isSolved} />
                    </div>

                    <section className="ps-text">
                        <button className="ps-close" type="button" aria-label="Sulje kohtaus" onClick={onClose}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M6 6 18 18M18 6 6 18" />
                            </svg>
                        </button>

                        {isSolved ? (
                            <>
                                <h2 className="ps-win">{scene.solved.praise}</h2>
                                <p className="ps-result">{scene.solved.resolution}</p>
                                {game && (
                                    <div className="ps-game">
                                        <span className="ps-game-disc">
                                            <Icon paths={game.icon} size={34} />
                                        </span>
                                        <div>
                                            <p className="ps-game-kicker">UUSI PELI</p>
                                            <p className="ps-game-name">{asName(game.name)}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="ps-actions">
                                    <button className="ps-button ps-button--main" type="button" onClick={onClose}>
                                        Jatka matkaa
                                    </button>
                                    <button className="ps-button" type="button" onClick={onGoToDashboard}>
                                        Kokeile peliä
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="ps-story">{scene.story}</p>
                                <p className="ps-question">{scene.question}</p>
                                <div className="ps-feedback" aria-live="polite">
                                    {feedback === 'wrong' && pickedItem ? (
                                        <p className="ps-hint-bubble">{scene.hints[pickedItem.id]}</p>
                                    ) : hasAnswer ? null : (
                                        <p className="ps-note-bubble">
                                            Tähän tarvitaan jotakin, mitä repussa ei vielä ole. Etsi lisää muilta mantereilta.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    <div className="ps-tray">
                        {allItems.map((item) => {
                            if (!owned.has(item.id)) {
                                return (
                                    <div
                                        key={item.id}
                                        className="ps-slot ps-slot--empty"
                                        aria-label="Tyhjä paikka, esine löytyy myöhemmin"
                                    >
                                        <span className="ps-slot-dot" />
                                    </div>
                                )
                            }
                            const isSelected = picked === item.id && feedback !== 'wrong'
                            const isTried = tried.includes(item.id) && !isSelected
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={
                                        'ps-slot'
                                        + (isSelected ? ' ps-slot--selected' : '')
                                        + (isTried ? ' ps-slot--tried' : '')
                                    }
                                    aria-pressed={isSelected}
                                    disabled={isSolved}
                                    onClick={() => pick(item.id)}
                                >
                                    <span className="ps-slot-dot">
                                        <Icon paths={item.icon} size={30} />
                                    </span>
                                    <span className="ps-slot-name">{item.name}</span>
                                </button>
                            )
                        })}

                        <button
                            type="button"
                            className="ps-use"
                            aria-label="Käytä esinettä"
                            disabled={isUseDisabled}
                            onClick={use}
                        >
                            Käytä
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
