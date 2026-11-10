import { useRef, useState } from 'react'
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
    const formRef = useRef(null)

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

    // Fills the form from the test accounts card. On a narrow screen the card sits
    // above the form, so the form is scrolled into view to show what was filled.
    const fillTestAccount = (account) => {
        setTeacherName(TEST_TEACHER)
        setStudentName(account.name)
        setPassword(account.password)
        setError('')
        const form = formRef.current
        if (form && form.getBoundingClientRect().top > window.innerHeight / 2) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

                    <form className="login-form" onSubmit={handleSubmit} ref={formRef}>
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
                    {/* translate="no" and notranslate keep browser translators off the
                        names and passwords, which have to be typed exactly as shown. */}
                    <dl className="student-login-test-row">
                        <dt>Opettajan nimi</dt>
                        <dd translate="no" className="notranslate">{TEST_TEACHER}</dd>
                    </dl>
                    {TEST_ACCOUNTS.map(account => (
                        <div className="student-login-test-account" key={account.name}>
                            <dl className="student-login-test-row">
                                <dt>Oppilaan nimi</dt>
                                <dd translate="no" className="notranslate">{account.name}</dd>
                                <dt>Salasana</dt>
                                <dd translate="no" className="notranslate">{account.password}</dd>
                            </dl>
                            <div className="student-login-test-footer">
                                <p className="student-login-test-note">{account.note}</p>
                                <button
                                    type="button"
                                    className="student-login-test-fill ink-shape ink-shape--thin ink-drop"
                                    onClick={() => fillTestAccount(account)}
                                >
                                    Täytä
                                </button>
                            </div>
                        </div>
                    ))}
                    <p className="student-login-test-warning">Tunnukset ovat yhteisiä ja palautuvat alkutilaan, kun kirjaudut ulos. Älä kirjoita niihin oikeita tietoja.</p>
                </aside>
            </div>
        </div>
    )
}

export default StudentLoginPage
