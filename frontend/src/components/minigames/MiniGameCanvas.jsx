// The shell every mini-game runs in: the fixed-step loop, the input, the score
// and best readout, and the game-over/again overlay.
//
// A game is a plain module — { width, height, unit, hint, create, update, draw }
// — and owns none of this. create() receives { buddy }, the pupil's buddy id, for
// a game that draws it. update(state, dt, input) is called at a fixed 1/60 s
// step so a slow frame never changes the physics. A game that has lives sets
// `lives` to how many and keeps `state.misses`; the bar then shows them as hearts.
//
// No rounds, no waves, no escalation: a run ends, the number is kept, the next
// run starts identical. The only thing that grows is the pupil's own best.

import { useEffect, useRef, useState } from 'react'
import heartUrl from '../../assets/icons/heart.png'
import heartEmptyUrl from '../../assets/icons/heart_empty.png'
import paperGrainUrl from '../../assets/minigames/paper_grain.jpg'
import InkFilter from '../ink/InkFilter.jsx'
import './MiniGameCanvas.css'

const STEP = 1 / 60
const MAX_STEPS = 5
const bestKey = (id) => `lukudiplomi.minigame.${id}.best`

function readBest(id) {
    try {
        return Number(window.localStorage.getItem(bestKey(id))) || 0
    } catch {
        return 0
    }
}

function writeBest(id, value) {
    try {
        window.localStorage.setItem(bestKey(id), String(value))
    } catch {
        // A blocked or full store is not a reason to lose the run.
    }
}

export default function MiniGameCanvas({ game, name, buddy, onClose }) {
    const canvasRef = useRef(null)
    const stateRef = useRef(null)
    // pointerX and pointerY are where a touch or a click sits on the stage, 0 at
    // the left and top edges and 1 at the right and bottom, or null when nothing
    // is held. A game that steers needs them; one that only needs a tap ignores them.
    const inputRef = useRef({
        pressed: false, justPressed: false, left: false, right: false, down: false,
        pointerX: null, pointerY: null
    })
    // There is no start screen: a run is live from the moment the game opens and
    // simply holds still until the pupil's first input (see `waiting`).
    const phaseRef = useRef('running')
    const [phase, setPhase] = useState('running')
    const [score, setScore] = useState(0)
    const [misses, setMisses] = useState(0)
    // True while a run has started but the pupil has not touched anything yet: every
    // game holds still until its first input, and this is when the controls are shown.
    const [waiting, setWaiting] = useState(true)
    const [best, setBest] = useState(() => readBest(game.id))

    const setPhaseBoth = (next) => {
        phaseRef.current = next
        setPhase(next)
    }

    const start = () => {
        stateRef.current = game.create({ buddy })
        setScore(0)
        setMisses(0)
        setPhaseBoth('running')
    }

    // One loop for the life of the component; the phase decides what it does.
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = game.width * dpr
        canvas.height = game.height * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        stateRef.current = game.create({ buddy })

        let raf = 0
        let previous = performance.now()
        let accumulator = 0

        const frame = (now) => {
            raf = requestAnimationFrame(frame)
            const elapsed = Math.min((now - previous) / 1000, 0.25)
            previous = now

            if (phaseRef.current === 'running') {
                accumulator += elapsed
                let steps = 0
                while (accumulator >= STEP && steps < MAX_STEPS) {
                    game.update(stateRef.current, STEP, inputRef.current)
                    inputRef.current.justPressed = false
                    accumulator -= STEP
                    steps += 1
                }
                if (accumulator > STEP * MAX_STEPS) accumulator = 0

                const live = stateRef.current
                setScore(live.score)
                setMisses(live.misses ?? 0)
                setWaiting(live.awake === false && !live.dead)
                if (live.dead) {
                    setPhaseBoth('dead')
                    setBest((current) => {
                        if (live.score <= current) return current
                        writeBest(game.id, live.score)
                        return live.score
                    })
                }
            } else {
                inputRef.current.justPressed = false
                setWaiting(false)
            }

            game.draw(ctx, stateRef.current)
        }

        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [game, buddy])

    // Keyboard. Space, Enter and Up all mean "act"; the arrows are there for the
    // games that steer.
    useEffect(() => {
        const act = (down) => {
            inputRef.current.pressed = down
            if (down) inputRef.current.justPressed = true
        }
        const onDown = (event) => {
            // The arrows steer the game, so the page behind must not scroll with
            // them, held keys included.
            if (event.key.startsWith('Arrow')) event.preventDefault()
            if (event.repeat) return
            switch (event.key) {
                case ' ': case 'Spacebar': case 'Enter': case 'ArrowUp': {
                    event.preventDefault()
                    if (phaseRef.current === 'running') act(true)
                    else start()
                    break
 }
                case 'ArrowLeft': { inputRef.current.left = true; break
                }
                case 'ArrowRight': { inputRef.current.right = true; break
                }
                case 'ArrowDown': { inputRef.current.down = true; break
                }
                case 'Escape': { onClose(); break
                }
                default: { break
                }
            }
        }
        const onUp = (event) => {
            switch (event.key) {
                case ' ': case 'Spacebar': case 'Enter': case 'ArrowUp': { act(false); break
 }
                case 'ArrowLeft': { inputRef.current.left = false; break
                }
                case 'ArrowRight': { inputRef.current.right = false; break
                }
                case 'ArrowDown': { inputRef.current.down = false; break
                }
                default: { break
                }
            }
        }
        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        return () => {
            window.removeEventListener('keydown', onDown)
            window.removeEventListener('keyup', onUp)
        }
    }, [onClose])

    const share = (offset, size) => Math.min(Math.max(offset / size, 0), 1)

    const placePointer = (event) => {
        const box = event.currentTarget.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) return
        inputRef.current.pointerX = share(event.clientX - box.left, box.width)
        inputRef.current.pointerY = share(event.clientY - box.top, box.height)
    }

    const onPointerDown = (event) => {
        event.preventDefault()
        placePointer(event)
        if (phaseRef.current === 'running') {
            inputRef.current.pressed = true
            inputRef.current.justPressed = true
        } else {
            start()
        }
    }

    const onPointerMove = (event) => {
        if (inputRef.current.pressed) placePointer(event)
    }

    const onPointerUp = () => {
        inputRef.current.pressed = false
        inputRef.current.pointerX = null
        inputRef.current.pointerY = null
    }

    return (
        <div className="mg-shell">
            <InkFilter />
            <div className="mg-bar">
                <h3 className="mg-name">{name}</h3>
                {game.lives > 0 && (
                    <div className="mg-lives" role="img" aria-label={`Elämiä jäljellä: ${game.lives - misses}`}>
                        {/* The hearts empty from the left. */}
                        {Array.from({ length: game.lives }, (_, i) => (
                            <img key={i} className="mg-heart" src={i < misses ? heartEmptyUrl : heartUrl} alt="" />
                        ))}
                    </div>
                )}
                <p className="mg-score">
                    <span className="mg-score-value">{score}</span>
                    <span className="mg-score-unit">{game.unit}</span>
                </p>
                <p className="mg-best">Paras: <strong>{best}</strong></p>
            </div>

            {/* The box carries the drawn frame; the stage inside keeps its rounded clip. */}
            <div className="mg-stage-box">
                <div
                    className="mg-stage"
                    style={{ aspectRatio: `${game.width} / ${game.height}` }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    // A long press is part of play, not a request for the page's menu.
                    onContextMenu={(event) => event.preventDefault()}
                >
                    <canvas ref={canvasRef} className="mg-canvas" />
                    {/* Inline because a CSS url() into src/assets does not resolve. */}
                    <div className="mg-paper" style={{ backgroundImage: `url(${paperGrainUrl})` }} aria-hidden="true" />

                    {phase === 'running' && waiting && (
                        <div className="mg-wake">
                            <p className="mg-wake-title">Kokeile liikkua!</p>
                            <p className="mg-wake-hint">{game.hint}</p>
                        </div>
                    )}

                    {phase === 'dead' && (
                        <div className="mg-overlay">
                            <p className="mg-over">Peli päättyi</p>
                            <p className="mg-result">
                                {score} {game.unit}
                                {score > 0 && score >= best ? ' — uusi ennätys!' : ''}
                            </p>
                            <button className="mg-start ink-shape ink-shape--thin ink-drop" type="button" onClick={start}>
                                Pelaa uudelleen
                            </button>
                            <p className="mg-hint">{game.hint}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
