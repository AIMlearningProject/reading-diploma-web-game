import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import InkFilter from '../components/ink/InkFilter'
import './StudentLoginPage.css'
import homeBG from '../assets/HomeBG1.jpg'
import SiteLogo from '../components/SiteLogo'
import { fetchLogin } from '../services/api'

// Seeded accounts for the public test period (db/seeds/01_test_data.js). When it
// ends, remove this list and the .student-login-test-card block below.
const TEST_TEACHER = 'teacher'
const TEST_ACCOUNTS = [
    { name: 'student', password: 'student', note: 'Uusi pelaaja, kaikki tasot aloittamatta.' },
    { name: 'Aino', password: 'Test123!', note: 'Kaksi tasoa suoritettu, kolmas kesken.' },
    { name: 'Onni', password: 'Test123!', note: 'Koko diplomi suoritettu, kaikki minipelit auki.' },
]

function StudentLoginPage() {
    const navigate = useNavigate()
    const { checkAuth } = useAuth()
    const [teacherName, setTeacherName] = useState('')
    const [studentName, setStudentName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            // Trimmed here too, so the fields show what was actually sent.
            const cleanTeacher = teacherName.trim()
            const cleanStudent = studentName.trim()
            setTeacherName(cleanTeacher)
            setStudentName(cleanStudent)
            await fetchLogin(cleanStudent, password, cleanTeacher)
            await checkAuth()
            navigate('/game')
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
            setSubmitting(false)
        }
    }

    return (
        <div className="student-login-page" style={{ '--page-art': `url(${homeBG})` }}>
            <InkFilter />
            <SiteLogo />
            <div className="student-login-columns">
                <div className="student-login-card ink-shape ink-drop">
                    <button className="back-button ink-shape ink-shape--thin ink-drop" onClick={() => navigate('/')}>
                        &larr; Takaisin
                    </button>
                    <h2>Oppilaan kirjautuminen</h2>
                    <p className="subtitle">Kirjaudu opettajasi antamilla tunnuksilla</p>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Opettajan nimi</label>
                            <span className="ink-field">
                                <input
                                    type="text"
                                    value={teacherName}
                                    onChange={(e) => setTeacherName(e.target.value)}
                                    required
                                />
                            </span>
                        </div>
                        <div className="form-group">
                            <label>Oppilaan nimi</label>
                            <span className="ink-field">
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    required
                                />
                            </span>
                        </div>
                        <div className="form-group">
                            <label>Salasana</label>
                            <span className="ink-field">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </span>
                        </div>
                        {error && <p className="error-message">{error}</p>}
                        <button type="submit" className="login-submit ink-shape ink-shape--thin ink-drop" disabled={submitting}>
                            {submitting ? 'Kirjaudutaan...' : 'Kirjaudu'}
                        </button>
                    </form>
                    <div className="login-divider"><span>tai</span></div>
                    <button type="button" className="google-button ink-shape ink-shape--thin ink-drop" onClick={() => window.location.assign('/auth/google')}>
                        Kirjaudu Google-tilillä
                    </button>
                </div>
                <aside className="student-login-card student-login-test-card ink-shape ink-drop">
                    <h2>Testitunnukset</h2>
                    <p className="subtitle">Testijakson aikana voit kokeilla peliä näillä tunnuksilla.</p>
                    <dl className="student-login-test-row">
                        <dt>Opettajan nimi</dt>
                        <dd>{TEST_TEACHER}</dd>
                    </dl>
                    {TEST_ACCOUNTS.map(account => (
                        <div className="student-login-test-account" key={account.name}>
                            <dl className="student-login-test-row">
                                <dt>Oppilaan nimi</dt>
                                <dd>{account.name}</dd>
                                <dt>Salasana</dt>
                                <dd>{account.password}</dd>
                            </dl>
                            <p className="student-login-test-note">{account.note}</p>
                        </div>
                    ))}
                    <p className="student-login-test-warning">Tunnukset ovat yhteisiä ja palautuvat alkutilaan, kun kirjaudut ulos. Älä kirjoita niihin oikeita tietoja.</p>
                </aside>
            </div>
        </div>
    )
}

export default StudentLoginPage
