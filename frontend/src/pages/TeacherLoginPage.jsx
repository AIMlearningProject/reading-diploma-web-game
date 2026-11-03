import { useNavigate } from 'react-router-dom'
import './TeacherLoginPage.css'
import homeBG from '../assets/HomeBG1.jpg'
import SiteLogo from '../components/SiteLogo'

function TeacherLoginPage() {
    const navigate = useNavigate()

    const handleGoogleLogin = () => {
        window.location.assign('/auth/google')
    }

    return (
        <div className="teacher-login-page" style={{ '--page-art': `url(${homeBG})` }}>
            <SiteLogo />
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
        </div>
    )
}

export default TeacherLoginPage
