import { useState, useEffect } from 'react'
import {
    fetchTransferRequestsInbox,
    fetchTransferRequestsOutbox,
    acceptTransferRequest,
    rejectTransferRequest,
    sendTransferRequest,
    deleteTransferRequest
} from '../../services/api'
import './TransferRequestPopup.css'

function TransferRequestPopup({ open, onClose }) {
    const [incomingRequests, setIncomingRequests] = useState([])
    const [sentRequests, setSentRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null)
    const [toast, setToast] = useState(null)
    const [error, setError] = useState('')
    const [toggleOutbox, setToggleOutbox] = useState(true)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [message, setMessage] = useState('')
    const [showAnswered, setShowAnswered] = useState(false)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => {
            setToast(null)
            if (type === 'success') {
                loadIncomingRequests()
                loadSentRequests()
            }
        }, 1700)
    }

    const loadIncomingRequests = async () => {
        try {
            setLoading(true)
            const data = await fetchTransferRequestsInbox()
            setIncomingRequests(data || [])
        } catch (err) {
            console.error('Failed to load incoming transfer requests:', err)
            setIncomingRequests([])
        } finally {
            setLoading(false)
        }
    }

    const loadSentRequests = async () => {
        try {
            setLoading(true)
            const data = await fetchTransferRequestsOutbox()
            setSentRequests(data || [])
        } catch (err) {
            console.error('Failed to load sent transfer requests:', err)
            setSentRequests([])
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        setError('')

        const body = { recipientEmail }
        if (message.trim()) body.message = message.trim()

        try {
            await sendTransferRequest(body)
            setRecipientEmail('')
            setMessage('')
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
        loadSentRequests()
    }

    const handleDelete = async (id, teacherEmail) => {
        if (!window.confirm(`Haluatko varmasti peruuttaa siirtopyynnön opettajalle "${teacherEmail}"? Siirtopyyntö poistuu kaikilta osapuolilta.`)) return
        try {
            await deleteTransferRequest(id)
            loadSentRequests()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleAccept = async (id) => {
        setProcessing(id)
        try {
            await acceptTransferRequest(id)
            showToast('Siirtopyyntö hyväksytty!')
        } catch (err) {
            showToast(err?.message || 'Yhteysvirhe', 'error')
        } finally {
            setProcessing(null)
        }
        window.location.reload()
    }

    const handleReject = async (id) => {
        setProcessing(id)
        try {
            await rejectTransferRequest(id)
            showToast('Siirtopyyntö hylätty!')
        } catch (err) {
            showToast(err?.message || 'Yhteysvirhe', 'error')
        } finally {
            setProcessing(null)
        }
    }

    useEffect(() => {
        loadIncomingRequests()
        loadSentRequests()
    }, [])

    useEffect(() => {
        (toggleOutbox ? loadSentRequests : loadIncomingRequests)()
        setError('')
    }, [toggleOutbox])

    const statusFi = {
        "pending": "Lähetetty",
        "rejected": "Hylätty",
        "accepted": "Hyväksytty",
        "cancelled": "Peruttu"
    }

    const convertDateFormat = (iso) => {
        const d = new Date(iso);
        return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
        /*${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}*/ // <-- time 00:00
    };

    const pendingIncomingRequests = incomingRequests.filter(r => r.status === 'pending')
    const incomingRequestHistory = incomingRequests.filter(r => r.status !== 'pending')

    if (!open) return null;

    return (
        <div className="tr-popup-overlay">
            <div className="tr-popup-window">
                <button className="tr-popup-close" onClick={onClose}>
                    ✕
                </button>
                <div className="dashboard-section tr-section">
                    {toast && (
                        <div className={`transfer-toast transfer-toast--${toast.type}`}>
                            {toast.message}
                        </div>
                    )}

                    <h2>Oppilaiden siirtopyynnöt</h2>

                    <div className="tr-list">
                        <div className="transfer-tabs">
                            <button
                                className={`transfer-tab ${toggleOutbox ? 'active' : ''}`}
                                onClick={() => setToggleOutbox(true)}
                            >
                                Lähetetyt
                            </button>

                            <button
                                className={`transfer-tab ${toggleOutbox ? '' : 'active'}`}
                                onClick={() => setToggleOutbox(false)}
                            >
                                Vastaanotetut
                            </button>
                        </div>

                        {toggleOutbox ? (
                            <>
                                {sentRequests.length > 0 ? (
                                    <>
                                        {/* Desktop view of sent transfer request list */}
                                        <div className="desktop-tr-list">
                                            {sentRequests.map((request) => (
                                                <div key={request.id} className="tr-item">
                                                    <div className="sent-item sent-header">
                                                        <span className="sent-email">{request.recipient_email}</span>

                                                        <span className={`tr-status tr-status--${request.status}`}>
                                                            {statusFi[request.status] ?? request.status}
                                                        </span>
                                                        <span className="desktop-sent-date">{convertDateFormat(request.created_at)}</span>

                                                        <button
                                                            className="delete-button"
                                                            onClick={() => handleDelete(request.id, request.recipient_email)}
                                                        >
                                                            Poista
                                                        </button>
                                                    </div>
                                                    <div className="sent-item">
                                                        {request.message && (
                                                            <div className="tr-message">
                                                                "{request.message}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Mobile view of sent transfer request list */}
                                        <div className="mobile-tr-list">
                                            {sentRequests.map((request) => (
                                                <div key={request.id} className="tr-item">
                                                    <div className='sent-item'>
                                                        <span className="sent-email">{request.recipient_email}</span>
                                                        <div className="mobile-sent-tr-header">
                                                            <span className={`tr-status tr-status--${request.status}`}>
                                                                {statusFi[request.status] ?? request.status}
                                                            </span>
                                                            <span className="sent-date">{convertDateFormat(request.created_at)}</span>
                                                        </div>

                                                        {request.message && (
                                                            <div className="tr-message">
                                                                "{request.message}"
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className='sent-item delete-tr'>
                                                        <button
                                                            className='delete-button'
                                                            onClick={() => handleDelete(request.id, request.recipient_email)}
                                                        >
                                                            Poista
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-message">Ei lähetettyjä siirtopyyntöjä.</div>
                                )}
                                <form className="add-form" encType="multipart/form-data" onSubmit={handleSend}>
                                    <div className="form-group">
                                        <label>
                                            Vastaanottaja
                                            <span className="section-error">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            required
                                            placeholder='Sähköposti'
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Viesti</label>
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="add-button">Lähetä pyyntö</button>
                                </form>
                            </>
                        ) : (
                            <>
                                {incomingRequestHistory.length > 0 &&
                                    <label className="tr-history-label">
                                        <input
                                            className="tr-history-checkbox"
                                            type="checkbox"
                                            checked={showAnswered}
                                            onChange={e => setShowAnswered(e.target.checked)}
                                        />
                                        Näytä historia
                                    </label>
                                }
                                {pendingIncomingRequests.length > 0 ? (
                                    incomingRequests.map((request) => (
                                        request.status === 'pending' ? (
                                            <div key={request.id} className="tr-item">
                                                <div className="tr-info">
                                                    <p className="tr-text">
                                                        Opettaja
                                                        <span className="tr-name"> {request.requester_name} </span>
                                                        ({request.requester_email}) haluaa siirtää {request?.student_count} opiskelijaa sinulle.
                                                    </p>
                                                    {request.message && (
                                                        <p className="tr-message">"{request.message}"</p>
                                                    )}
                                                </div>

                                                <div className="tr-actions">
                                                    <button
                                                        className="accept-button"
                                                        onClick={() => handleAccept(request.id)}
                                                        disabled={processing !== null}
                                                    >
                                                        {processing === request.id ? 'Käsitellään...' : 'Hyväksy'}
                                                    </button>
                                                    <button
                                                        className="reject-button"
                                                        onClick={() => handleReject(request.id)}
                                                        disabled={processing !== null}
                                                    >
                                                        {processing === request.id ? 'Käsitellään...' : 'Hylkää'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (showAnswered && (
                                            <div key={request.id} className="tr-item sent-item">
                                                <div className="sent-header tr-text">
                                                    <span className="tr-name">{request.requester_name}</span>
                                                    <span>{request.requester_email}</span>
                                                    <div className="tr-options">
                                                        <span className={`tr-status tr-status--${request.status}`}>
                                                            {statusFi[request.status] ?? request.status}
                                                        </span>
                                                        <span className="sent-date">{convertDateFormat(request.created_at)}</span>
                                                    </div>
                                                </div>

                                                {request.message && (
                                                    <div className="tr-message">
                                                        "{request.message}"
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ))
                                ) : (
                                    <>
                                        <div className="empty-message">Ei odottavia siirtopyyntöjä.</div>
                                        {showAnswered && (
                                            incomingRequests.map((request) => (
                                                <div key={request.id} className="tr-item sent-item">
                                                    <div className="sent-header tr-text">
                                                        <span className="tr-name">{request.requester_name}</span>
                                                        <span>{request.requester_email}</span>
                                                        <div className="tr-options">
                                                            <span className={`tr-status tr-status--${request.status}`}>
                                                                {statusFi[request.status] ?? request.status}
                                                            </span>
                                                            <span className="sent-date">{convertDateFormat(request.created_at)}</span>
                                                        </div>
                                                    </div>

                                                    {request.message && (
                                                        <div className="tr-message">
                                                            "{request.message}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {error && <p className="section-error">{error}</p>}
                </div>
            </div>
        </div>
    )
}

export default TransferRequestPopup
