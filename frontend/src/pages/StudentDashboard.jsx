import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BUDDIES, BuddySprite, BuddyIcon } from '../components/BuddyAvatar'
import homeBG from '../assets/HomeBG1.jpg'
import MinigameModal from '../components/minigames/MinigameModal'
import './StudentDashboard.css'
import {
    fetchProgress,
    fetchRewards,
    fetchSubmissions,
    updateUserAvatar,
} from '../services/api'

const LEVELS = [
    { level: 1, name: 'Pohjoisnapa' },
    { level: 2, name: 'Eurooppa' },
    { level: 3, name: 'Aasia' },
    { level: 4, name: 'Pohjois-Amerikka' },
    { level: 5, name: 'Etelä-Amerikka' },
    { level: 6, name: 'Afrikka' },
    { level: 7, name: 'Oseania' },
    { level: 8, name: 'Etelämanner' },
]

function StudentDashboard() {
    const { user, logout, checkAuth } = useAuth()
    const navigate = useNavigate()
    const [progress, setProgress] = useState([])
    const [submissions, setSubmissions] = useState([]) // Submissions not yet used in the student dashboard
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)
    const [buddySelecting, setBuddySelecting] = useState(false)
    const [selectedBuddy, setSelectedBuddy] = useState('')
    const [buddySaving, setBuddySaving] = useState(false)
    const [buddyError, setBuddyError] = useState('')
    const [openGame, setOpenGame] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [prog, rew, subs] = await Promise.all([
                    fetchProgress(),
                    fetchRewards(),
                    fetchSubmissions(),
                ])

                setProgress(prog)
                setRewards(Array.isArray(rew) ? rew : [])
                setSubmissions(Array.isArray(subs) ? subs : [])
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

    const completedCount = progress.filter(p => p.level_status === 'complete' || p.level_status === 'reviewed').length
    const hasBuddy = !!user?.avatar
    const showPicker = !hasBuddy || buddySelecting

    const statusFi = {
        "incomplete": "Kesken",
        "complete": "Suoritettu",
        "resubmit": "X Hylätty",
        "reviewed": "✓ Hyväksytty"
    }

    const mapFi = {
        'ArcticMap': 'Pohjoisnapa',
        'EuropeMap': 'Eurooppa',
        'AsiaMap': 'Aasia',
        'NorthAmericaMap': 'Pohjois Amerikka',
        'SouthAmericaMap': 'Etelä Amerikka',
        'AfricaMap': 'Afrikka',
        'OceaniaMap': 'Oseania',
        'AntarcticaMap': 'Etelämanner'
    }

    return (
        <div
            className="student-dashboard"
            style={{ backgroundImage: `linear-gradient(rgba(235,243,254,0.82), rgba(235,243,254,0.82)), url(${homeBG})` }}
        >
            <header className="student-header">
                <h1>Matkapäiväkirja</h1>
                <div className="header-right">
                    {hasBuddy && <BuddyIcon buddyId={user.avatar} size={38} />}
                    <span>{hasBuddy
                        ? <>matkustaa <strong>{user?.name}</strong> kanssa!</>
                        : <>Tervetuloa, {user?.name}</>
                    }</span>
                    <button
                        className="play-button"
                        onClick={hasBuddy ? handlePlay : undefined}
                        disabled={!hasBuddy}
                        title={hasBuddy ? undefined : 'Valitse ensin seikkailukaveri'}
                    >
                        ▶ Pelaa
                    </button>
                    <button className="logout-button" onClick={handleLogout}>
                        Kirjaudu ulos
                    </button>
                </div>
            </header>

            <div className="student-content">
                {loading ? (
                    <p className="loading-text">Ladataan...</p>
                ) : (
                    <>
                        <section className={`dashboard-section buddy-selection-section${hasBuddy ? '' : ' buddy-selection-section--prominent'}`}>
                            <h2>Seikkailukaveri</h2>
                            {showPicker ? (
                                <div className="buddy-picker">
                                    <div className="char-grid">
                                        {BUDDIES.map(({ id, name }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`char-option${selectedBuddy === id ? ' char-option--selected' : ''}`}
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
                                            className="play-button"
                                            onClick={handleBuddySave}
                                            disabled={!selectedBuddy || buddySaving}
                                        >
                                            {buddySaving ? 'Tallennetaan...' : 'Tallenna'}
                                        </button>
                                        {buddySelecting && (
                                            <button className="logout-button" onClick={() => setBuddySelecting(false)}>
                                                Peruuta
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="buddy-current">
                                    <div className="buddy-current-showcase">
                                        <div className="buddy-current-glow" />
                                        <BuddySprite buddyId={user.avatar} size={150} />
                                    </div>
                                    <p className="buddy-current-name">
                                        {BUDDIES.find(b => b.id === user.avatar)?.name ?? user.avatar}
                                    </p>
                                    <button
                                        className="change-avatar-button"
                                        onClick={() => {
                                            setSelectedBuddy(user.avatar)
                                            setBuddySelecting(true)
                                        }}
                                    >
                                        Vaihda kaveria
                                    </button>
                                </div>
                            )}
                        </section>

                        <section className="dashboard-section voyage-log">
                            <h2>Matkakirja</h2>
                            <p className="voyage-summary">
                                Olet suorittanut <strong>{completedCount}</strong> / <strong>8</strong> matkaa
                            </p>
                            <div className="level-grid">
                                {LEVELS.map(({ level, name }) => {
                                    const levelStat = getStatus(level)
                                    return (
                                        <div key={level} className={`level-card level-${levelStat}`}>
                                            <span className="level-number">{level}</span>
                                            <span className="level-name">{name}</span>
                                            <span className={`level-badge badge-${levelStat}`}>
                                                {statusFi[levelStat] ?? levelStat}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        <section className="dashboard-section rewards-section">
                            <h2>Palkinnot</h2>
                            {rewards.length === 0 ? (
                                <p className="empty-message">Ei palkintoja vielä — lue kirjoja ansaitaksesi!</p>
                            ) : (
                                <div className="rewards-grid">
                                    {rewards.map((r) => (
                                        r.name = mapFi[r.name] ?? r.name,
                                        r.reward_type.includes('minigame') ? (
                                            <div key={r.id} className="reward-card-game" onClick={() => setOpenGame(r)}>
                                                <span className="reward-type">{r.name} — minipeli</span>
                                                <span className="reward-name">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 860" width="40px" fill="#1e3a5f">
                                                        <path d="m272-440 208 120 208-120-168-97v137h-80v-137l-168 97Zm168-189v-17q-44-13-72-49.5T340-780q0-58 41-99t99-41q58 0 99 41t41 99q0 48-28 84.5T520-646v17l280 161q19 11 29.5 29.5T840-398v76q0 22-10.5 40.5T800-252L520-91q-19 11-40 11t-40-11L160-252q-19-11-29.5-29.5T120-322v-76q0-22 10.5-40.5T160-468l280-161Zm0 378L200-389v67l280 162 280-162v-67L520-251q-19 11-40 11t-40-11Zm82.5-486.5Q540-755 540-780t-17.5-42.5Q505-840 480-840t-42.5 17.5Q420-805 420-780t17.5 42.5Q455-720 480-720t42.5-17.5ZM480-160Z"/>
                                                    </svg>
                                                </span>
                                            </div>
                                        ) : (
                                            <div key={r.id} className="reward-card">
                                                <span className="reward-type">{r.reward_type}</span>
                                                <span className="reward-name">{r.name}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
            {openGame && (
                <MinigameModal reward={openGame} onClose={() => setOpenGame(null)} />
            )}
        </div>
    )
}

export default StudentDashboard
