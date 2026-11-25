// The buddy's camp, shown on the student dashboard once a buddy is chosen.
// The scene itself lives in game/camp/campScene.js; this hosts its canvas,
// runs its loop and passes clicks on. Around it: the camp's sign, two light
// planks nailed over the frame's top edge as the section's title, a quiet
// bubble in the sky saying what the buddy is doing, and under the scene the
// actions passed in as children.

import { useEffect, useRef, useState } from 'react'
import * as camp from '../../game/camp/campScene.js'
import { phaseAt } from '../../game/camp/schedule.js'
import './CampScene.css'

// For now only bed time has a line. The others are kept for later: uncomment
// one and the sky shows it while the buddy does that.
const DOING = {
    // stroll: (name) => `${name} kävelee rannalla.`,
    // sea: (name) => `${name} katselee merta.`,
    // read: (name) => `${name} lukee kirjaa.`,
    // fire: (name) => `${name} lämmittelee nuotiolla.`,
    // fireRead: (name) => `${name} lukee nuotion valossa.`,
    bed: (name) => `${name} nukkuu jo teltassa. Hyvää yötä! Pienten seikkailijoiden on aika mennä nukkumaan.`
}

const phaseNow = () => phaseAt(new Date())

// The activities that happen by the fire, under the night sky.
const AT_NIGHT = new Set(['fire', 'fireRead', 'bed'])

export default function CampScene({ buddy, buddyName, playerName, children }) {
    const canvasRef = useRef(null)
    const stateRef = useRef(null)
    const [activity, setActivity] = useState(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        stateRef.current = camp.create({ buddy, phase: phaseNow() })

        // The backing store follows the canvas's drawn size at the device's pixel ratio.
        const fit = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 3)
            const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
            canvas.width = width
            canvas.height = Math.round(width * camp.STAGE_H / camp.STAGE_W)
            ctx.setTransform(width / camp.STAGE_W, 0, 0, width / camp.STAGE_W, 0, 0)
            ctx.imageSmoothingQuality = 'high'
        }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(canvas)

        let raf = 0
        let previous = performance.now()
        const frame = (now) => {
            raf = requestAnimationFrame(frame)
            // The first frame's timestamp can come before the performance.now() above.
            const dt = Math.min(Math.max((now - previous) / 1000, 0), 0.1)
            previous = now
            const state = stateRef.current
            camp.update(state, dt, phaseNow())
            camp.draw(ctx, state)
            setActivity(camp.activityOf(state))
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            observer.disconnect()
        }
    }, [buddy])

    const toStage = (event) => {
        const rect = canvasRef.current.getBoundingClientRect()
        return [
            (event.clientX - rect.left) * camp.STAGE_W / rect.width,
            (event.clientY - rect.top) * camp.STAGE_H / rect.height
        ]
    }

    const onPointerDown = (event) => {
        camp.tap(stateRef.current, ...toStage(event))
    }

    const onPointerMove = (event) => {
        const over = camp.hitsBuddy(stateRef.current, ...toStage(event))
        canvasRef.current.style.cursor = over ? 'pointer' : ''
    }

    return (
        <div className="camp-scene">
            <div className="camp-scene-frame">
                <canvas
                    ref={canvasRef}
                    className="camp-scene-canvas"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                />
                <span className="camp-scene-frame-line" aria-hidden="true" />
                {DOING[activity] && (
                    <p
                        className={`camp-scene-bubble camp-scene-bubble--${AT_NIGHT.has(activity) ? 'night' : 'day'}`}
                        aria-live="polite"
                    >
                        {DOING[activity](buddyName)}
                    </p>
                )}
                <div className="camp-scene-sign">
                    <h2 className="camp-scene-plank camp-scene-plank--title ink-shape ink-shape--thin">
                        <span className="camp-scene-nail camp-scene-nail--left" />
                        Seikkailuleiri
                        <span className="camp-scene-nail camp-scene-nail--right" />
                    </h2>
                    <p className="camp-scene-plank camp-scene-plank--names ink-shape ink-shape--thin">
                        <span className="camp-scene-nail camp-scene-nail--left" />
                        {buddyName} ja {playerName} leireilevät
                        <span className="camp-scene-nail camp-scene-nail--right" />
                    </p>
                </div>
            </div>
            <div className="camp-scene-footer">
                {children}
            </div>
        </div>
    )
}
