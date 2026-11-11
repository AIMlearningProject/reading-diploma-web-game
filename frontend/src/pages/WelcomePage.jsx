import bookIcon from '../assets/icons/book_50.png'
import compassIcon from '../assets/icons/compass_50.png'
import InkIcon from '../components/ink/InkIcon'
import { FEEDBACK_FORM_URL } from '../links'
import { useNavigate } from 'react-router-dom'
import InkFilter from '../components/ink/InkFilter'
import './WelcomePage.css'
import homeBG from '../assets/HomeBG1.jpg'
import SiteLogo from '../components/SiteLogo'

function WelcomePage() {
    const navigate = useNavigate()

    return (
        <div className="welcome-page" style={{ '--page-art': `url(${homeBG})` }}>
            <InkFilter />
            <SiteLogo className="welcome-title" />

            <div className="role-cards">
                {/* Both cards are drawn in ink, at the same quieter weight, so neither
                    way in outweighs the other. */}
                <div className="role-card role-card--ink ink-shape ink-drop" onClick={() => navigate('/login/teacher')}>
                    <div className="role-icon ink-shape ink-shape--round ink-shape--thin">
                        <InkIcon src={compassIcon} size={50} />
                    </div>
                    <h2>Opettaja</h2>
                    <p>Hallinnoi oppilaita ja kirjoja</p>
                </div>

                <div className="role-card role-card--ink ink-shape ink-drop" onClick={() => navigate('/login/student')}>
                    <div className="role-icon ink-shape ink-shape--round ink-shape--thin">
                        <InkIcon src={bookIcon} size={50} />
                    </div>
                    <h2>Oppilas</h2>
                    <p>Lue kirjoja ja ansaitse palkintoja</p>
                </div>
            </div>

            <div className="welcome-notes">
                <p>
                    Jätä palautetta / leave feedback{' '}
                    <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer">
                        Google Forms
                    </a>
                </p>
                <p>Tarvitsetko apua? Ota yhteys opettajaasi.</p>
            </div>
        </div>
    )
}

export default WelcomePage
