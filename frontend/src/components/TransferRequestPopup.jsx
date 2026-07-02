import { useState, useEffect } from 'react'
import {
    fetchTransferRequestsInbox,
    fetchTransferRequestsOutbox,
    acceptTransferRequest,
    rejectTransferRequest,
    sendTransferRequest,
    deleteTransferRequest
} from '../services/api'
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
        /*${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}*/
    };

    const pendingIncomingRequests = incomingRequests.filter(r => r.status === 'pending')

    if (!open) return null;

    return (
        <div className="tr-popup-overlay">
            <div className="tr-popup-window">
                <button className="tr-popup-close" onClick={onClose}>
                    ✕
                </button>
                <div className="dashboard-section transfer-request-section">
                    {toast && (
                        <div className={`transfer-toast transfer-toast--${toast.type}`}>
                            {toast.message}
                        </div>
                    )}

                    <h2>Oppilaiden siirtopyynnöt</h2>

                    <div className="transfer-requests-list">
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

                        {/*loading ? (
                            <p className="empty-message">Ladataan...</p>
                        ) : (*/
                            toggleOutbox ? (
                                <>
                                    {sentRequests.length > 0 ?
                                        sentRequests.map((request) => (
                                            <div key={request.id} className="transfer-request-item sent-item">
                                                <div className="sent-header">
                                                    <span className="sent-email">{request.recipient_email}</span>
                                                    <span className="sent-date">{convertDateFormat(request.created_at)}</span>
                                                </div>
                                                <div className="sent-options">
                                                    <span className={`transfer-request-status transfer-request-status--${request.status}`}>
                                                        {statusFi[request.status] ?? request.status}
                                                    </span>
                                                    <button
                                                        className='delete-button'
                                                        onClick={() => handleDelete(request.id, request.recipient_email)}
                                                    >
                                                        Poista
                                                    </button>
                                                </div>



                                                {request.message && (
                                                    <div className="transfer-request-message">
                                                        {request.message}
                                                    </div>
                                                )}

                                            </div>
                                        )) : (
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
                                pendingIncomingRequests.length > 0 ? (
                                    incomingRequests.map((request) => (
                                        request.status === 'pending' && (
                                            <div key={request.id} className="transfer-request-item">
                                                <div className="transfer-request-info">
                                                    <p className="transfer-request-text">
                                                        Opettaja
                                                        <span className="transfer-request-name"> {request.requester_name}</span>
                                                        ({request.requester_email}) haluaa siirtää {request?.student_count} opiskelijaa sinulle.
                                                    </p>
                                                    {request.message && (
                                                        <p className="transfer-request-message">"{request.message}"</p>
                                                    )}
                                                </div>

                                                <div className="transfer-request-actions">
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
                                        )
                                    ))
                                ) : (
                                    <div className="empty-message">Ei odottavia siirtopyyntöjä.</div>
                                )
                            )
                        /*)*/}
                    </div>
                    {error && <p className="section-error">{error}</p>}
                </div>
            </div>
        </div>
    )
}

export default TransferRequestPopup
