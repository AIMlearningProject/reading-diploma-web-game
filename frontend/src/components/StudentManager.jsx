import React, { useState, useEffect, useContext } from 'react'
import BooksContext from '../contexts/BooksContext'
import InfoButton from './InfoButton'
import {
    createStudent,
    deleteStudent,
    fetchMyStudents,
    fetchStudentProgress,
    fetchStudentSubmissions,
    resetStudentPassword,
    updateSubmissionStatus,
    updateUserEmail,
    updateUserName
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

function StudentManager() {
    const [students, setStudents] = useState([])
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [resetPwdId, setResetPwdId] = useState(null)
    const [resetPwd, setResetPwd] = useState('')
    const [resetPwdError, setResetPwdError] = useState('')
    const [editEmailId, setEditEmailId] = useState(null)
    const [editEmail, setEditEmail] = useState('')
    const [editEmailError, setEditEmailError] = useState('')
    const [progressMap, setProgressMap] = useState({})
    const [submissionsMap, setSubmissionsMap] = useState({})
    const [expandedId, setExpandedId] = useState(null)
    const [loadingSubs, setLoadingSubs] = useState(false)

    // CSS hover for student rows
    const [hoveredStudentId, setHoveredStudentId] = useState(null);

    const { books } = useContext(BooksContext)

    const fetchStudents = async () => {
        try {
            const res = await fetchMyStudents()
            setStudents(res)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    useEffect(() => {
        if (students.length === 0) return
        const loadProgress = async () => {
            const entries = await Promise.allSettled(
                students.map(s => fetchStudentProgress(s.id))
            )
            const map = {}
            students.forEach((s, i) => {
                map[s.id] = entries[i].status === 'fulfilled' ? entries[i].value : []
            })
            setProgressMap(map)
        }
        loadProgress()
    }, [students])

    const handleAdd = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const body = { name, password }
            if (email.trim()) body.email = email.trim()
            await createStudent(body)
            setName('')
            setPassword('')
            setEmail('')
            fetchStudents()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleEditSave = async (id) => {
        if (!editName.trim()) return
        try {
            await updateUserName(id, editName.trim())
            setEditingId(null)
            fetchStudents()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const handlePasswordReset = async (id) => {
        if (resetPwd.length < 3) {
            setResetPwdError('Salasanan on oltava vähintään 3 merkkiä')
            return
        }
        setResetPwdError('')
        try {
            await resetStudentPassword(id, resetPwd)
            setResetPwdId(null)
            setResetPwd('')
        } catch (err) {
            setResetPwdError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleEmailSave = async (id) => {
        setEditEmailError('')
        try {
            await updateUserEmail(id, editEmail.trim())
            setEditEmailId(null)
            fetchStudents()
        } catch (err) {
            setEditEmailError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleDelete = async (id, studentName) => {
        if (!window.confirm(`Haluatko varmasti poistaa oppilaan "${studentName}"?`)) return
        try {
            await deleteStudent(id)
            fetchStudents()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleToggleSubmissions = async (studentId) => {
        if (expandedId === studentId) {
            setExpandedId(null)
            return
        }
        setExpandedId(studentId)
        if (!submissionsMap[studentId]) {
            setLoadingSubs(true)
            try {
                const data = await fetchStudentSubmissions(studentId)
                setSubmissionsMap(prev => ({ ...prev, [studentId]: data }))
            } catch {
                setSubmissionsMap(prev => ({ ...prev, [studentId]: [] }))
            } finally {
                setLoadingSubs(false)
            }
        }
    }

    const handleLevelStatusChange = async (studentId, level, newStatus) => {
        const updatedEntry = await updateSubmissionStatus(level, studentId, newStatus)
        setProgressMap(prev => {
            const studentProgress = prev[studentId] ? [...prev[studentId]] : []
            const idx = studentProgress.findIndex(p => p.level === level)
            if (idx !== -1 && updatedEntry) {
                studentProgress[idx] = { ...studentProgress[idx], level_status: updatedEntry.level_status }
            }
            return { ...prev, [studentId]: studentProgress }
        })
    }

    return (
        <div className="dashboard-section">
            <h2>Oppilaat {students.length > 0 && <span className="student-count">{students.length}</span>}</h2>
            {students.length > 0 ? (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nimi</th>
                            <th>Sähköposti</th>
                            <th>Toiminnot</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s) => {
                            const progress = progressMap[s.id] || []
                            const submissions = submissionsMap[s.id]
                            const isExpanded = expandedId === s.id
                            return (
                                <React.Fragment key={s.id}>
                                    <tr
                                        className={`
                                            ${resetPwdId === s.id ? 'editing-row lock-row' : (editingId === s.id || editEmailId === s.id ? 'editing-row' : '')}
                                            ${hoveredStudentId === s.id && !isExpanded ? 'highlight-student-row' : ''}
                                            student-info-row
                                        `}
                                        onMouseEnter={() => setHoveredStudentId(s.id)}
                                        onMouseLeave={() => setHoveredStudentId(null)}
                                    >
                                        <td data-label="Nimi">
                                            {editingId === s.id ? (
                                                <input
                                                    className="inline-edit-input"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    {s.name}
                                                    <button
                                                        className="icon-btn--edit"
                                                        onClick={() => { setEditingId(s.id); setEditName(s.name); setResetPwdId(null); setEditEmailId(null) }}
                                                        title="Muokkaa nimeä"
                                                    >
                                                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                                            <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" />
                                                            <path d="M7.5 3.5L10.5 6.5" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                        <td data-label="Sähköposti">
                                            {editEmailId === s.id ? (
                                                <>
                                                    <input
                                                        className="inline-edit-input"
                                                        type="email"
                                                        value={editEmail}
                                                        onChange={(e) => { setEditEmail(e.target.value); setEditEmailError('') }}
                                                        autoFocus
                                                    />
                                                    {editEmailError && <span className="section-error" style={{ fontSize: '0.8rem' }}>{editEmailError}</span>}
                                                </>
                                            ) : (
                                                <>
                                                    {s.email
                                                        ? <><span className="gmail-g">G</span>{s.email}</>
                                                        : <span className="gmail-empty">—</span>}
                                                    <button
                                                        className="icon-btn--edit"
                                                        onClick={() => { setEditEmailId(s.id); setEditEmail(s.email || ''); setEditingId(null); setResetPwdId(null) }}
                                                        title="Muokkaa sähköpostia"
                                                    >
                                                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                                            <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" />
                                                            <path d="M7.5 3.5L10.5 6.5" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                        <td data-label="Toiminnot">
                                            {editingId === s.id ? (
                                                <>
                                                    <button className="add-button" style={{ padding: '0.35rem 0.75rem', alignSelf: 'unset', fontSize: '0.85rem' }} onClick={() => handleEditSave(s.id)}>Tallenna</button>
                                                    <button className="cancel-button" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginLeft: '0.5rem' }} onClick={() => setEditingId(null)}>Peruuta</button>
                                                </>
                                            ) : editEmailId === s.id ? (
                                                <>
                                                    <button className="add-button" style={{ padding: '0.35rem 0.75rem', alignSelf: 'unset', fontSize: '0.85rem' }} onClick={() => handleEmailSave(s.id)}>Tallenna</button>
                                                    <button className="cancel-button" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginLeft: '0.5rem' }} onClick={() => { setEditEmailId(null); setEditEmailError('') }}>Peruuta</button>
                                                </>
                                            ) : resetPwdId === s.id ? (
                                                <div className="pwd-reset-widget">
                                                    <input
                                                        className="pwd-reset-input"
                                                        type="password"
                                                        placeholder="Uusi salasana"
                                                        value={resetPwd}
                                                        onChange={(e) => { setResetPwd(e.target.value); setResetPwdError('') }}
                                                        autoFocus
                                                    />
                                                    {resetPwdError && <span className="pwd-reset-error">{resetPwdError}</span>}
                                                    <div className="pwd-reset-actions">
                                                        <button className="pwd-save-btn" onClick={() => handlePasswordReset(s.id)}>Tallenna</button>
                                                        <button className="cancel-button" onClick={() => { setResetPwdId(null); setResetPwd(''); setResetPwdError('') }}>Peruuta</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="row-actions">
                                                    <button
                                                        className="icon-btn icon-btn--lock"
                                                        onClick={() => { setResetPwdId(s.id); setResetPwd(''); setResetPwdError(''); setEditingId(null); setEditEmailId(null) }}
                                                        title="Vaihda salasana"
                                                    >
                                                        <svg viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="15" height="18">
                                                            <rect x="1" y="9" width="16" height="12" rx="1.5" />
                                                            <path d="M4.5 9V7A4.5 4 0 0 1 13.5 7V9" />
                                                            <circle cx="9" cy="15" r="1.8" fill="currentColor" stroke="none" />
                                                            <path d="M8.1 16.5 L8.1 18.5 L9.9 18.5 L9.9 16.5" fill="currentColor" stroke="none" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="delete-button"
                                                        onClick={() => handleDelete(s.id, s.name)}
                                                    >
                                                        Poista
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Progress row */}
                                    <tr
                                        className={`progress-row ${hoveredStudentId === s.id && !isExpanded ? 'highlight-student-row' : ''}`}
                                        onMouseEnter={() => setHoveredStudentId(s.id)}
                                        onMouseLeave={() => setHoveredStudentId(null)}
                                    >
                                        <td colSpan={3}>
                                            <div className="progress-bar-row">
                                                <div className="level-badges">
                                                    {LEVELS.map(({ level, name: levelName }) => {
                                                        const entry = progress.find(p => p.level === level)
                                                        const status = entry?.level_status || 'incomplete'
                                                        return (
                                                            <span
                                                                key={level}
                                                                className={`progress-level-badge progress-level-badge--${status}`}
                                                                title={`${levelName}${status === 'complete' || status === 'reviewed' ? ' ✓' : ''}`}
                                                            >
                                                                {level}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                                <button
                                                    className="expand-btn"
                                                    onClick={() => handleToggleSubmissions(s.id)}
                                                >
                                                    {isExpanded ? 'Piilota palautukset' : 'Näytä palautukset'}
                                                    <svg
                                                        className={`expand-chevron ${isExpanded ? 'expand-chevron--open' : ''}`}
                                                        viewBox="0 0 12 12" width="12" height="12"
                                                        fill="none" stroke="currentColor" strokeWidth="2"
                                                        strokeLinecap="round" strokeLinejoin="round"
                                                    >
                                                        <path d="M3 4.5L6 7.5L9 4.5" />
                                                    </svg>
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <div className="submissions-detail">
                                                    {loadingSubs && !submissions ? (
                                                        <p className="empty-message">Ladataan...</p>
                                                    ) : (submissions && submissions.length > 0 ? (
                                                        LEVELS
                                                            .map(({ level, name: levelName }) => {
                                                                const progressEntry = progress.find(p => p.level === level)
                                                                if (!progressEntry) return null; // Only show levels with progress entries
                                                                const sub = submissions.find(sb => sb.completedLevel === progressEntry?.id)
                                                                const status = progressEntry?.level_status || 'incomplete'

                                                                const book = books.find(b => b?.id === progressEntry?.book)
                                                                const title = book?.title
                                                                return (
                                                                    <div key={level} className="submission-group">
                                                                        <h4 className="submission-level-title" style={{ display: 'flex', gap: 12 }}>
                                                                            <span>Taso {level} — {levelName}</span>
                                                                            <div className="info-button-row">
                                                                                <select
                                                                                    className={`level-status-select status-${status}`}
                                                                                    value={status}
                                                                                    onChange={e => handleLevelStatusChange(s.id, level, e.target.value)}
                                                                                >
                                                                                    <option value="incomplete">Suorittamatta</option>
                                                                                    <option value="complete">Suoritettu</option>
                                                                                    <option value="resubmit">Hylätty</option>
                                                                                    <option value="reviewed">Hyväksytty</option>
                                                                                </select>
                                                                                {level === 1 && <InfoButton positionStyle={{ left: "-90px" }} info={'Suorittamatta: Oppilaan täytyy lukea kirja loppuun tällä tasolla ja vastata avoimiin kysymyksiin suorittaakseen tason.\n\n Suoritettu: Oppilas on lukenut kirjan loppuun ja vastannut avoimiin kysymyksiin tällä tasolla.\n\n Hylätty: Opettaja on tarkistanut ja EI hyväksynyt tasolla annettuja vastauksia. Oppilas voi suorittaa tason uudestaan.\n\n Hyväksytty: Opettaja on tarkistanut ja hyväksynyt tasolla annetut, luettuun kirjaan liittyvät vastaukset.'} />}
                                                                            </div>
                                                                        </h4>
                                                                        {title &&
                                                                            <div className="book-title">
                                                                                <span><strong>KIRJA: </strong>{title}</span>
                                                                            </div>}
                                                                        {sub ? (
                                                                            <div className="submission-qa">
                                                                                <p><strong>K1:</strong> {sub.question1}</p>
                                                                                <p className="submission-answer"><strong>V1:</strong> {sub.answer1}</p>
                                                                                <p><strong>K2:</strong> {sub.question2}</p>
                                                                                <p className="submission-answer"><strong>V2:</strong> {sub.answer2}</p>
                                                                                <p><strong>K3:</strong> {sub.question3}</p>
                                                                                <p className="submission-answer"><strong>V3:</strong> {sub.answer3}</p>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                )
                                                            })
                                                    ) : (
                                                        <p className="empty-message">Ei palautuksia vielä.</p>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            ) : (
                <p className="empty-message">Ei oppilaita vielä.</p>
            )}

            <form className="add-form" onSubmit={handleAdd}>
                <div className="form-group">
                    <label>
                        Nimi
                        <span className="section-error">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={3}
                    />
                </div>
                <div className="form-group">
                    <label>
                        Salasana
                        <span className="section-error">*</span>
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={3}
                    />
                </div>
                <div className="form-group">
                    <label>Sähköposti</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <button type="submit" className="add-button">Lisää oppilas</button>
            </form>
            {error && <p className="section-error">{error}</p>}
        </div>
    )
}

export default StudentManager
