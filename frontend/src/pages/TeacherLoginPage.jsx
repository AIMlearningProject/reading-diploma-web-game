import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './TeacherLoginPage.css'
import homeBG from '../assets/HomeBG1.jpg'
import SiteLogo from '../components/SiteLogo'
import { fetchTestTeacherLogin } from '../services/api'

function TeacherLoginPage() {
    const navigate = useNavigate()
    const { checkAuth } = useAuth()
    const [testError, setTestError] = useState('')
    const [creatingTest, setCreatingTest] = useState(false)

    const handleGoogleLogin = () => {
        window.location.assign('/auth/google')
    }

    // Public test period only, see .teacher-login-test-card below.
    const handleTestTeacherLogin = async () => {
        setTestError('')
        setCreatingTest(true)
        try {
            await fetchTestTeacherLogin()
            await checkAuth()
            navigate('/teacher/dashboard')
        } catch (err) {
            setTestError(err?.message || 'Yhteysvirhe')
            setCreatingTest(false)
        }
    }

    return (
        <div className="teacher-login-page" style={{ '--page-art': `url(${homeBG})` }}>
            <SiteLogo />
            <div className="teacher-login-columns">
                <div className="login-card">
                    <button className="back-button" onClick={() => navigate('/')}>
                        &larr; Takaisin
                    </button>
                    <h2>Opettajan kirjautuminen</h2>
                    <p>Kirjaudu Google-tililläsi</p>
                    <button className="google-button" onClick={handleGoogleLogin}>
                        Kirjaudu Google-tilillä
                    </button>
                </div>
                {/* Public test period only. When it ends, remove this card, its
                    handler above and its section in TeacherLoginPage.css. */}
                <aside className="login-card teacher-login-test-card">
                    <h2>Testaa opettajana</h2>

                    <h3>Testiopettaja</h3>
                    <p>Oma valmis testiluokka: 5 oppilasta ja 24 kirjaa.</p>
                    <button
                        type="button"
                        className="teacher-login-test-button"
                        onClick={handleTestTeacherLogin}
                        disabled={creatingTest}
                    >
                        {creatingTest ? 'Luodaan testiluokkaa...' : 'Kokeile testiopettajana'}
                    </button>
                    {testError && <p className="teacher-login-test-error">{testError}</p>}
                    <p className="teacher-login-test-notice">
                        Muutokset poistuvat, kun kirjaudut ulos tai vuorokauden kuluttua.
                    </p>

                    <h3>Oma Google-tili</h3>
                    <p>Luo oma tyhjä opettajatunnus.</p>
                </aside>
            </div>
        </div>
    )
}

export default TeacherLoginPage
