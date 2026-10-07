// The puzzle scene panel: a story over the continent map, an item picked out of
// the backpack, and a mini-game as the reward for picking the right one.
//
// The visual design is fixed — see .claude/skills/lukudiplomi-puzzle-scene and
// docs/puzzle-scenes-design.md. Frames are line-300, controls line-500, brass is
// never a border, and the 1280x800 frame scales to the viewport rather than
// reflowing. Page CSS is global, so every class here is prefixed `ps-`.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SceneIllustration from './SceneIllustration.jsx'
import { miniGameById } from '../../game/data/miniGames.js'
import './PuzzleScene.css'

const SLOT_COUNT = 6

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

function BackpackIcon() {
    return (
        <svg
            width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
            <path d="M5 10a7 7 0 0 1 14 0v8.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            <path d="M9 10V7.5a3 3 0 0 1 6 0V10" />
            <path d="M9 14.5h6v4H9z" />
        </svg>
    )
}

export default function PuzzleScene({
    scene,
    inventory = [],
    alreadySolved = false,
    onSolved,
    onClose,
    onGoToDashboard
}) {
    const [picked, setPicked] = useState(null)
    const [feedback, setFeedback] = useState(alreadySolved ? 'solved' : 'none')
    const [tried, setTried] = useState([])
    const frameRef = useRef(null)
    const grantedRef = useRef(alreadySolved)

    const isSolved = feedback === 'solved'
    const ownsAnswer = inventory.some((item) => item.id === scene.correctItem)
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

    const slots = [
        ...inventory,
        ...Array.from({ length: Math.max(0, SLOT_COUNT - inventory.length) }, () => null)
    ].slice(0, Math.max(SLOT_COUNT, inventory.length))

    const isUseDisabled = isSolved || !picked || feedback === 'wrong'

    return (
        <div className="ps-scrim" role="dialog" aria-modal="true" aria-label={scene.title}>
            <div className="ps-frame" ref={frameRef}>
                <div className="ps-panel">

                    <header className="ps-header">
                        <div className="ps-heading">
                            <p className="ps-kicker">{scene.continentKicker}</p>
                            <h2 className="ps-title">{scene.title}</h2>
                        </div>
                        <span className="ps-pill-scene">
                            KOHTAUS {scene.sceneIndex} / {scene.sceneCount}
                        </span>
                        <button className="ps-close" type="button" aria-label="Sulje kohtaus" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                                <path d="M6 6 18 18M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <div className="ps-body">
                        <div className="ps-art-box">
                            <SceneIllustration sceneId={scene.id} solved={isSolved} />
                        </div>

                        <section className={`ps-card${isSolved ? ' ps-card--solved' : ''}`}>
                            {isSolved ? (
                                <>
                                    <span className="ps-pill-solved">RATKAISTU</span>
                                    <p className="ps-praise">{scene.solved.praise}</p>
                                    <p className="ps-resolution">{scene.solved.resolution}</p>

                                    {game && (
                                        <div className="ps-ticket">
                                            <span className="ps-ticket-disc">
                                                <Icon paths={game.icon} size={34} />
                                            </span>
                                            <div className="ps-ticket-text">
                                                <p className="ps-ticket-kicker">SAIT UUDEN PELIN</p>
                                                <p className="ps-ticket-name">{game.name}</p>
                                                <p className="ps-ticket-pitch">{game.pitch}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="ps-actions">
                                        <button className="ps-button-primary" type="button" onClick={onClose}>
                                            Jatka matkaa
                                        </button>
                                        <button className="ps-button-secondary" type="button" onClick={onGoToDashboard}>
                                            Oppilaan sivulle
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="ps-card-heading">TARINA</h3>
                                    <p className="ps-story">{scene.story}</p>
                                    <p className="ps-question">{scene.question}</p>

                                    <div className="ps-feedback" aria-live="polite">
                                        {feedback === 'wrong' && pickedItem ? (
                                            <div className="ps-feedback-wrong">
                                                <span className="ps-pill-retry">YRITÄ UUDELLEEN</span>
                                                <p className="ps-hint-text">{scene.hints[pickedItem.id]}</p>
                                            </div>
                                        ) : pickedItem ? (
                                            <div className="ps-feedback-selected">
                                                <p className="ps-feedback-kicker">VALITTU ESINE</p>
                                                <p className="ps-feedback-name">{pickedItem.name}</p>
                                                <p className="ps-feedback-desc">{pickedItem.desc}</p>
                                            </div>
                                        ) : (
                                            <p className="ps-feedback-choose">
                                                {ownsAnswer
                                                    ? 'Napauta repusta esinettä, niin näet, mitä se tekee.'
                                                    : 'Tähän tarvitaan jotakin, mitä repussa ei vielä ole. Etsi lisää muilta mantereilta.'}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </section>
                    </div>

                    <div className="ps-tray">
                        <div className="ps-backpack">
                            <BackpackIcon />
                            <span className="ps-backpack-name">REPPU</span>
                            <span className="ps-backpack-count">
                                {inventory.length} {inventory.length === 1 ? 'esine' : 'esinettä'}
                            </span>
                        </div>

                        <div className="ps-slots">
                            {slots.map((item, index) => {
                                if (!item) {
                                    return (
                                        <div
                                            key={`empty-${index}`}
                                            className="ps-slot ps-slot--empty"
                                            aria-label="Tyhjä paikka, esine löytyy myöhemmin"
                                        >
                                            <span className="ps-slot-empty-mark">?</span>
                                            <span className="ps-slot-empty-label">Tulossa</span>
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
                                        {isSelected && <span className="ps-slot-pill">VALITTU</span>}
                                        {isTried && <span className="ps-slot-pill ps-slot-pill--tried">KOKEILTU</span>}
                                        <Icon paths={item.icon} size={40} />
                                        <span className="ps-slot-name">{item.name}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="ps-use-wrap">
                            <button
                                type="button"
                                className="ps-use"
                                aria-label="Käytä esinettä"
                                disabled={isUseDisabled}
                                onClick={use}
                            >
                                <span className="ps-use-verb">KÄYTÄ</span>
                                <span className="ps-use-object">esinettä</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
