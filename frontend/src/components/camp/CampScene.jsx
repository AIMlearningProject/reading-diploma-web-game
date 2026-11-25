// The buddy's camp, shown on the student dashboard once a buddy is chosen.
// The scene itself lives in game/camp/campScene.js; this hosts its canvas,
// runs its loop, passes clicks on and lays the good-night note over it.

import { useEffect, useRef, useState } from 'react'
import * as camp from '../../game/camp/campScene.js'
import { phaseAt } from '../../game/camp/schedule.js'
import './CampScene.css'

const phaseNow = () => phaseAt(new Date())

export default function CampScene({ buddy }) {
    const canvasRef = useRef(null)
    const stateRef = useRef(null)
    const [bedtime, setBedtime] = useState(false)

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
            setBedtime(state.phase === 'bed')
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
            <div className="camp-scene-stage">
                <canvas
                    ref={canvasRef}
                    className="camp-scene-canvas"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                />
                {bedtime && (
                    <p className="camp-scene-note ink-shape ink-shape--thin ink-drop">
                        Hyvää yötä! Pienten seikkailijoiden on aika mennä nukkumaan.
                    </p>
                )}
            </div>
        </div>
    )
}
