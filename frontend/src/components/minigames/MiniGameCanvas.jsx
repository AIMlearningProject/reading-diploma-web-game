// The shell every mini-game runs in: the fixed-step loop, the input, the score
// and best readout, and the start/again overlay.
//
// A game is a plain module — { width, height, unit, hint, create, update, draw }
// — and owns none of this. update(state, dt, input) is called at a fixed 1/60 s
// step so a slow frame never changes the physics.
//
// No rounds, no waves, no escalation: a run ends, the number is kept, the next
// run starts identical. The only thing that grows is the pupil's own best.

import { useEffect, useRef, useState } from 'react'
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

export default function MiniGameCanvas({ game, name, onClose }) {
    const canvasRef = useRef(null)
    const stateRef = useRef(null)
    const inputRef = useRef({ pressed: false, justPressed: false, left: false, right: false, down: false })
    const phaseRef = useRef('ready')
    const [phase, setPhase] = useState('ready')
    const [score, setScore] = useState(0)
    const [best, setBest] = useState(() => readBest(game.id))

    const setPhaseBoth = (next) => {
        phaseRef.current = next
        setPhase(next)
    }

    const start = () => {
        stateRef.current = game.create()
        setScore(0)
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

        stateRef.current = game.create()

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
            }

            game.draw(ctx, stateRef.current)
        }

        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [game])

    // Keyboard. Space, Enter and Up all mean "act"; the arrows are there for the
    // games that steer.
    useEffect(() => {
        const act = (down) => {
            inputRef.current.pressed = down
            if (down) inputRef.current.justPressed = true
        }
        const onDown = (event) => {
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

    const onPointerDown = (event) => {
        event.preventDefault()
        if (phaseRef.current === 'running') {
            inputRef.current.pressed = true
            inputRef.current.justPressed = true
        } else {
            start()
        }
    }

    const onPointerUp = () => { inputRef.current.pressed = false }

    return (
        <div className="mg-shell">
            <div className="mg-bar">
                <h3 className="mg-name">{name}</h3>
                <p className="mg-score">
                    <span className="mg-score-value">{score}</span>
                    <span className="mg-score-unit">{game.unit}</span>
                </p>
                <p className="mg-best">Paras: <strong>{best}</strong></p>
            </div>

            <div
                className="mg-stage"
                style={{ aspectRatio: `${game.width} / ${game.height}` }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <canvas ref={canvasRef} className="mg-canvas" />

                {phase !== 'running' && (
                    <div className="mg-overlay">
                        {phase === 'dead' && <p className="mg-over">Peli päättyi</p>}
                        {phase === 'dead' && (
                            <p className="mg-result">
                                {score} {game.unit}
                                {score > 0 && score >= best ? ' — uusi ennätys!' : ''}
                            </p>
                        )}
                        <button className="mg-start" type="button" onClick={start}>
                            {phase === 'dead' ? 'Pelaa uudelleen' : 'Aloita'}
                        </button>
                        <p className="mg-hint">{game.hint}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
