// Development-only bench for the puzzle scenes and their mini-games, mounted at
// /puzzle-preview and registered only when import.meta.env.DEV.
//
// It exists so the scenes can be judged as surfaces — opened, mis-solved,
// solved, replayed — without first reading eight books. It is not part of the
// pupil's route and ships in no production build.

import { useState } from 'react'
import PuzzleScene from '../components/puzzle/PuzzleScene.jsx'
import MiniGameCanvas from '../components/minigames/MiniGameCanvas.jsx'
import puzzleScenes from '../game/data/puzzleScenes.js'
import items from '../game/data/items.js'
import { miniGameById } from '../game/data/miniGames.js'
import './PuzzlePreview.css'

export default function PuzzlePreview() {
    const [owned, setOwned] = useState(items.map((item) => item.id))
    const [openScene, setOpenScene] = useState(null)
    const [openGame, setOpenGame] = useState(null)
    const [solved, setSolved] = useState([])

    const toggle = (id) => setOwned((current) => (
        current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    ))

    const inventory = items.filter((item) => owned.includes(item.id))

    return (
        <div className="pv-page">
            <header className="pv-header">
                <h1>Puzzle scene bench</h1>
                <p>Development only. Pick what the backpack holds, then open a scene.</p>
            </header>

            <section className="pv-block">
                <h2>Reppu</h2>
                <div className="pv-row">
                    {items.map((item) => (
                        <label key={item.id} className="pv-check">
                            <input
                                type="checkbox"
                                checked={owned.includes(item.id)}
                                onChange={() => toggle(item.id)}
                            />
                            {item.name}
                            <span className="pv-muted">{item.homeMapKey}</span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="pv-block">
                <h2>Kohtaukset</h2>
                <div className="pv-row">
                    {puzzleScenes.map((scene, index) => (
                        <button
                            key={scene.id}
                            type="button"
                            className="pv-button"
                            onClick={() => setOpenScene(scene)}
                        >
                            <strong>S{index + 5} {scene.title}</strong>
                            <span className="pv-muted">{scene.mapKey} · tarvitsee: {scene.correctItem}</span>
                            {solved.includes(scene.id) && <span className="pv-solved">ratkaistu</span>}
                        </button>
                    ))}
                </div>
            </section>

            <section className="pv-block">
                <h2>Minipelit</h2>
                <div className="pv-row">
                    {puzzleScenes.map((scene, index) => {
                        const game = miniGameById(scene.reward.gameId)
                        return (
                            <button
                                key={scene.reward.gameId}
                                type="button"
                                className="pv-button"
                                disabled={!game?.module}
                                onClick={() => setOpenGame(game)}
                            >
                                <strong>G{index + 5} {game.name}</strong>
                                <span className="pv-muted">{game.module ? 'valmis' : 'tulossa'}</span>
                            </button>
                        )
                    })}
                </div>
                {openGame?.module && (
                    <div className="pv-game">
                        <MiniGameCanvas
                            game={openGame.module}
                            name={openGame.name}
                            onClose={() => setOpenGame(null)}
                        />
                        <button className="pv-button" type="button" onClick={() => setOpenGame(null)}>
                            Sulje peli
                        </button>
                    </div>
                )}
            </section>

            {openScene && (
                <PuzzleScene
                    scene={openScene}
                    inventory={inventory}
                    alreadySolved={false}
                    onSolved={(gameId) => {
                        setSolved((current) => (
                            current.includes(openScene.id) ? current : [...current, openScene.id]
                        ))
                        console.info('[preview] solved, granted', gameId)
                    }}
                    onClose={() => setOpenScene(null)}
                    onGoToDashboard={() => setOpenScene(null)}
                />
            )}
        </div>
    )
}
