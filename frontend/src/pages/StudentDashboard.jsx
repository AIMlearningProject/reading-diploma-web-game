import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BUDDIES, BuddySprite, BuddyIcon } from '../components/BuddyAvatar'
import InkIcon from '../components/ink/InkIcon'
import InkFilter from '../components/ink/InkFilter'
import CampScene from '../components/camp/CampScene'
import homeBG from '../assets/HomeBG1.jpg'
import siteBoat from '../assets/siteBoat.png'
import playIcon from '../assets/icons/play.png'
import swapIcon from '../assets/icons/swap_pair.png'
import SceneGameModal from '../components/minigames/SceneGameModal'
import items from '../game/data/items'
import { miniGameById } from '../game/data/miniGames'
import './StudentDashboard.css'
import {
    fetchProgress,
    fetchRewards,
    updateUserAvatar,
} from '../services/api'

// ­ is a soft hyphen: where a long name breaks when a phone row is too
// narrow for it, see .level-name.
const LEVELS = [
    { level: 1, name: 'Pohjois­napa' },
    { level: 2, name: 'Eurooppa' },
    { level: 3, name: 'Aasia' },
    { level: 4, name: 'Pohjois-Amerikka' },
    { level: 5, name: 'Etelä-Amerikka' },
    { level: 6, name: 'Afrikka' },
    { level: 7, name: 'Oseania' },
    { level: 8, name: 'Etelä­manner' },
]

function StudentDashboard() {
    const { user, logout, checkAuth } = useAuth()
    const navigate = useNavigate()
    const [progress, setProgress] = useState([])
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)
    const [buddySelecting, setBuddySelecting] = useState(false)
    const [selectedBuddy, setSelectedBuddy] = useState('')
    const [buddySaving, setBuddySaving] = useState(false)
    const [buddyError, setBuddyError] = useState('')
    const [openSceneGame, setOpenSceneGame] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [prog, rew] = await Promise.all([
                    fetchProgress(),
                    fetchRewards(),
                ])

                setProgress(prog)
                setRewards(Array.isArray(rew) ? rew : [])
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    const handlePlay = () => {
        navigate('/game')
    }

    const handleBuddySave = async () => {
        if (!selectedBuddy) return
        setBuddySaving(true)
        setBuddyError('')
        try {
            await updateUserAvatar(user.id, selectedBuddy)
            await checkAuth()
            setBuddySelecting(false)
        } catch (err) {
            setBuddyError(err?.message || 'Yhteysvirhe')
        } finally {
            setBuddySaving(false)
        }
    }

    const getStatus = (level) => {
        const entry = progress.find(p => p.level === level)
        return entry?.level_status ?? 'incomplete'
    }

    // The backpack and the scene mini-games share the rewards table;
    // reward_type is what tells them apart.
    const ownedItemIds = new Set(
        rewards.filter(r => r.reward_type === 'item').map(r => String(r.name))
    )
    const sceneGames = rewards
        .filter(r => r.reward_type === 'scene-game')
        .map(r => ({ id: r.id, game: miniGameById(String(r.name)) }))
        .filter(entry => entry.game)

    const completedCount = progress.filter(p => p.level_status === 'complete' || p.level_status === 'reviewed').length
    const hasBuddy = !!user?.avatar
    const showPicker = !hasBuddy || buddySelecting

    const statusFi = {
        "incomplete": "Kesken",
        "complete": "Suoritettu",
        "resubmit": "X Hylätty",
        "reviewed": "✓ Hyväksytty"
    }

    return (
        <div
            className="student-dashboard"
            style={{ '--page-art': `url(${homeBG})` }}
        >
            <InkFilter />
            <header className="student-header">
                <h1>
                    <img className="student-header-boat" src={siteBoat} alt="" width="75" height="73" />
                    <span>Matkapäiväkirja</span>
                </h1>
                <div className="header-right">
                    {hasBuddy && <BuddyIcon buddyId={user.avatar} size={38} />}
                    <span>{hasBuddy
                        ? <>matkustaa <strong>{user?.name}</strong> kanssa!</>
                        : <>Tervetuloa, {user?.name}</>
                    }</span>
                    {/* The ink play icon, not the ▶ character: phones draw that
                        as a coloured emoji. */}
                    <button
                        className="play-button sd-play-button ink-shape ink-shape--thin ink-drop"
                        onClick={hasBuddy ? handlePlay : undefined}
                        disabled={!hasBuddy}
                        title={hasBuddy ? undefined : 'Valitse ensin seikkailukaveri'}
                    >
                        <InkIcon src={playIcon} size={20} />
                        Pelaa
                    </button>
                    <button className="logout-button ink-shape ink-shape--thin ink-drop" onClick={handleLogout}>
                        Kirjaudu ulos
                    </button>
                </div>
            </header>

            <div className="student-content">
                {loading ? (
                    <p className="loading-text">Ladataan...</p>
                ) : (
                    <>
                        <section className={`dashboard-section ink-shape ink-drop buddy-selection-section${hasBuddy ? '' : ' buddy-selection-section--prominent'}`}>
                            {/* With a buddy, the camp's own sign is the section's title. */}
                            {showPicker && <h2>Seikkailukaveri</h2>}
                            {showPicker ? (
                                <div className="buddy-picker">
                                    <div className="char-grid">
                                        {BUDDIES.map(({ id, name }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`char-option ink-shape ink-shape--thin ink-drop${selectedBuddy === id ? ' char-option--selected' : ''}`}
                                                onClick={() => setSelectedBuddy(id)}
                                            >
                                                <div className="char-option-stage">
                                                    <BuddySprite buddyId={id} size={160} />
                                                    {selectedBuddy === id && <span className="char-check">✓</span>}
                                                </div>
                                                <span className="char-label">{name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {buddyError && <p className="avatar-error">{buddyError}</p>}
                                    <div className="avatar-picker-actions">
                                        <button
                                            className="play-button ink-shape ink-shape--thin ink-drop"
                                            onClick={handleBuddySave}
                                            disabled={!selectedBuddy || buddySaving}
                                        >
                                            {buddySaving ? 'Tallennetaan...' : 'Tallenna'}
                                        </button>
                                        {buddySelecting && (
                                            <button className="logout-button ink-shape ink-shape--thin ink-drop" onClick={() => setBuddySelecting(false)}>
                                                Peruuta
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="buddy-current">
                                    <CampScene
                                        buddy={user.avatar}
                                        buddyName={BUDDIES.find(b => b.id === user.avatar)?.name ?? user.avatar}
                                        playerName={user.name}
                                    >
                                        <button
                                            className="change-avatar-button ink-shape ink-shape--thin ink-drop"
                                            onClick={() => {
                                                setSelectedBuddy(user.avatar)
                                                setBuddySelecting(true)
                                            }}
                                        >
                                            <InkIcon src={swapIcon} size={20} />
                                            Kutsu toinen kaveri
                                        </button>
                                    </CampScene>
                                </div>
                            )}
                        </section>

                        <section className="dashboard-section ink-shape ink-drop voyage-log">
                            <h2>Matkakirja</h2>
                            <p className="voyage-summary">
                                Olet suorittanut <strong>{completedCount}</strong> / <strong>8</strong> matkaa
                            </p>
                            <div className="level-grid">
                                {LEVELS.map(({ level, name }) => {
                                    const levelStat = getStatus(level)
                                    return (
                                        <div key={level} className={`level-card level-${levelStat}`}>
                                            <span className="level-number ink-shape ink-shape--round ink-shape--hair">{level}</span>
                                            <span className="level-name">{name}</span>
                                            <span className={`level-badge badge-${levelStat}`}>
                                                {statusFi[levelStat] ?? levelStat}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        {sceneGames.length > 0 && (
                            <section className="dashboard-section ink-shape ink-drop sd-scene-games-section">
                                <h2>Kohtausten pelit</h2>
                                <div className="rewards-grid">
                                    {sceneGames.map(({ id, game }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            className="sd-scene-game ink-shape ink-shape--thin ink-drop"
                                            disabled={!game.module}
                                            onClick={() => setOpenSceneGame(game)}
                                        >
                                            <span className="sd-scene-game-disc ink-shape ink-shape--round ink-shape--thin">
                                                <InkIcon src={game.icon} size={34} />
                                            </span>
                                            <span className="sd-scene-game-name">{game.name}</span>
                                            <span className="sd-scene-game-pitch">
                                                {game.module ? 'Pelaa' : 'Tulossa pian'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="dashboard-section ink-shape ink-drop sd-backpack-section">
                            <h2>Reppu</h2>
                            <p className="sd-backpack-lead">
                                Esineitä löytyy matkan varrelta. Jollakin toisella mantereella niistä on apua.
                            </p>
                            <div className="sd-backpack-grid">
                                {items.map((item) => {
                                    const isOwned = ownedItemIds.has(item.id)
                                    return (
                                        <div
                                            key={item.id}
                                            className={`sd-item${isOwned ? '' : ' sd-item--missing'}`}
                                        >
                                            <span className="sd-item-disc ink-shape ink-shape--round ink-shape--hair">
                                                {isOwned ? (
                                                    <InkIcon src={item.icon[28]} size={28} />
                                                ) : (
                                                    <span className="sd-item-mark">?</span>
                                                )}
                                            </span>
                                            <span className="sd-item-name">
                                                {isOwned ? item.name : 'Vielä löytämättä'}
                                            </span>
                                            {isOwned && <span className="sd-item-desc">{item.desc}</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
            {openSceneGame && (
                <SceneGameModal game={openSceneGame} buddy={user?.avatar} onClose={() => setOpenSceneGame(null)} />
            )}
        </div>
    )
}

export default StudentDashboard
