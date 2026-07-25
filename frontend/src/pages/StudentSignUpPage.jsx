import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import homeBG from '../assets/HomeBG1.jpg';
import { createStudentWithInvite, fetchLogin } from '../services/api';

const LOCAL_STORAGE_KEY = 'hasUsedStudentInvite';

function StudentSignUpPage() {
    const navigate = useNavigate();
    const { checkAuth } = useAuth();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Extract token from URL: /sign-up/student?token=abc123
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const teacherName = params.get('teacher');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Prevents multiple student accounts from being created for a specific teacher on a single device
        // (Can be easily worked around by just changing the teacher param. in the URL)
        const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY + teacherName);
        if (dismissed) {
            setError('Olet jo luonut oppilaskäyttäjän.');
            return;
        }
        if (!token) {
            setError('Virheellinen tai puuttuva kutsulinkki.');
            return;
        }
        setSubmitting(true)

        try {
            const body = {
                name,
                password,
                email: email || undefined,
                token
            }
            if (email.trim()) body.email = email.trim();

            const res = await createStudentWithInvite(body);

            await fetchLogin(name, password, res.teacher_name);
            await checkAuth();
            localStorage.setItem(LOCAL_STORAGE_KEY + teacherName, 'true');
            navigate('/game');
            setName('');
            setPassword('');
            setEmail('');
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="student-login-page" style={{ backgroundImage: `linear-gradient(rgba(235,243,254,0.78), rgba(235,243,254,0.78)), url(${homeBG})` }}>
            <h1 className="site-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Lukudiplomi</h1>
            <div className="student-login-card">
                <h2>Oppilaan rekisteröinti</h2>
                <p className="subtitle">Liity opettajan {<strong>{teacherName}</strong>} oppilaaksi.</p>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>
                            Nimi
                            <span className="section-error">*</span>
                            <input
                                name='nimi'
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={3}
                            />
                        </label>
                    </div>
                    <div className="form-group">
                        <label>
                            Sähköposti
                            <input
                                name='sähköposti'
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="form-group">
                        <label>
                            Salasana
                            <span className="section-error">*</span>
                            <input
                                name='salasana'
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={3}
                            />
                        </label>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="login-submit" disabled={submitting}>
                        {submitting ? 'Rekisteröidytään...' : 'Rekisteröidy'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default StudentSignUpPage