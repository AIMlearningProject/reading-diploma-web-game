// The puzzle scene panel: a story over the continent map, an item picked out of
// the backpack, and a mini-game as the reward for picking the right one.
//
// Drawn the way the scene art is drawn: hand-wobbled ink outlines and dithered
// shadows over the picture-book palette, and as little text as the story
// allows. The 1280x800 frame scales to the viewport rather than reflowing.
// Page CSS is global, so every class here is prefixed `ps-`.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SceneIllustration from './SceneIllustration.jsx'
import allItems from '../../game/data/items.js'
import { miniGameById } from '../../game/data/miniGames.js'
import closeIcon from '../../assets/icons/close_26.png'
import InkFilter from '../ink/InkFilter.jsx'
import InkIcon from '../ink/InkIcon.jsx'
import './PuzzleScene.css'

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
            <InkFilter />
            <div className="ps-frame" ref={frameRef}>
                <div className="ps-panel ink-shape ink-drop">
                    <div className="ps-art-box">
                        <SceneIllustration sceneId={scene.id} solved={isSolved} />
                    </div>

                    <section className="ps-text">
                        <button className="ps-close ink-shape ink-shape--round ink-shape--thin" type="button" aria-label="Sulje kohtaus" onClick={onClose}>
                            <InkIcon src={closeIcon} size={26} />
                        </button>

                        {isSolved ? (
                            <>
                                <h2 className="ps-win">{scene.solved.praise}</h2>
                                <p className="ps-result">{scene.solved.resolution}</p>
                                {game && (
                                    <div className="ps-game">
                                        <span className="ps-game-disc ink-shape ink-shape--round ink-shape--thin">
                                            <InkIcon src={game.icon} size={34} />
                                        </span>
                                        <div>
                                            <p className="ps-game-kicker">UUSI PELI</p>
                                            <p className="ps-game-name">{asName(game.name)}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="ps-actions">
                                    <button className="ps-button ps-button--main ink-shape ink-drop" type="button" onClick={onClose}>
                                        Jatka matkaa
                                    </button>
                                    <button className="ps-button ink-shape ink-drop" type="button" onClick={onGoToDashboard}>
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
                                        <p className="ps-hint-bubble ink-shape">{scene.hints[pickedItem.id]}</p>
                                    ) : hasAnswer ? null : (
                                        <p className="ps-note-bubble ink-shape">
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
                                        className="ps-slot ps-slot--empty ink-shape"
                                        aria-label="Tyhjä paikka, esine löytyy myöhemmin"
                                    >
                                        <span className="ps-slot-dot ink-shape ink-shape--round ink-shape--thin" />
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
                                        'ps-slot ink-shape ink-drop'
                                        + (isSelected ? ' ps-slot--selected' : '')
                                        + (isTried ? ' ps-slot--tried' : '')
                                    }
                                    aria-pressed={isSelected}
                                    disabled={isSolved}
                                    onClick={() => pick(item.id)}
                                >
                                    <span className="ps-slot-dot ink-shape ink-shape--round ink-shape--thin">
                                        <InkIcon src={item.icon[30]} size={30} />
                                    </span>
                                    <span className="ps-slot-name">{item.name}</span>
                                </button>
                            )
                        })}

                        <button
                            type="button"
                            className="ps-use ink-shape ink-drop"
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
