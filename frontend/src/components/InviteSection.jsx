import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext';
import { fetchInviteLink, regenerateInviteLink, toggleInviteLink } from '../services/api'
import InfoButton from './InfoButton'
import QRCode from 'qrcode'
import { createPortal } from 'react-dom'
import './InviteSection.css'

function InviteSection() {
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [invite, setInvite] = useState(null)
    const [error, setError] = useState('')
    const [qrData, setQrData] = useState(null)
    const [zoomSrc, setZoomSrc] = useState(null)

    // Used for button click animations
    const [copied, setCopied] = useState(false)
    const [shared, setShared] = useState(false)
    const [downloaded, setDownloaded] = useState(false)

    const fullUrl = invite
        ? `${window.location.origin}/sign-up/student?token=${invite.inviteToken}&teacher=${user?.name}`
        : ''

    const copyLink = () => {
        if (!invite) return
        navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1250)
    }

    const formatDate = (iso) => {
        if (!iso) return "Ei vanhene"
        const d = new Date(iso)
        return d.toLocaleString("fi-FI", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const createQRcode = async () => {
        try {
            const createdQRcode = await QRCode.toDataURL(fullUrl, { width: 300 })
            setQrData(createdQRcode)
        } catch (err) {
            setError(err?.message || 'QR koodia ei voitu luoda')
        }
    }

    const shareQRcode = async () => {
        if (!navigator.share) {
            setError('Linkin kutsupainike ei toimi selaimellasi.')
            return
        }

        try {
            await navigator.share?.({
                title: "Lukudiplomi — kutsu",
                text: `Tervetuloa suorittamaan lukudiplomia!

${fullUrl}`,
            })

            setShared(true)
            setTimeout(() => setShared(false), 300)
        } catch (err) {
            setError(err?.message || 'QR koodia ei voitu jakaa')
        }
    }

    const regenerateInvite = async () => {
        setError('')
        try {
            const inviteLinkData = await regenerateInviteLink()
            setInvite(inviteLinkData);
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const toggleActive = async () => {
        setError('')
        try {
            const inviteLinkData = await toggleInviteLink()
            setInvite(inviteLinkData)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const fetchInvite = async () => {
        setError('')
        try {
            const inviteLinkData = await fetchInviteLink()
            setInvite(inviteLinkData)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    // Fetch invite when section is opened
    useEffect(() => {
        if (!open) return;
        fetchInvite()
    }, [open])

    useEffect(() => {
        if (!fullUrl) return;
        createQRcode()
    }, [fullUrl])

    return (
        <div className="invite-container">
            <button
                className="expand-btn"
                onClick={() => setOpen(!open)}
            >
                {open ? 'Piilota kutsu' : 'Kutsu oppilaita'}
                <svg
                    className={`expand-chevron ${open ? 'expand-chevron--open' : ''}`}
                    viewBox="0 0 12 12" width="12" height="12"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                >
                    <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
            </button>

            {open && invite && (
                <div className="invite-card">
                    <div>
                        {/* Title + Link (active/inactive) + modified_at Date */}
                        <div className="invite-link-header">
                            <span className='invite-caption'>Kutsulinkki</span>
                            <InfoButton info={`Tässä näet kutsulinkin, jonka avulla oppilaasi voivat tehdä itselleen käyttäjätunnuksen. \n Linkillä voi tehdä vain yhden käyttäjän per laite. \n\n Kun painat "Uusi linkki", vanhaa linkkiä ei voi enää käyttää. \n\n Päivämäärä kertoo millon linkki on viimeksi uusittu, otettu käyttöön tai poistettu käytöstä.`} />
                            <span className={`invite-text ${invite.active ? "active" : "inactive"}`}>
                                {invite.active ? "Käytössä" : "Ei käytössä"}
                            </span>
                        </div>
                        
                        <div className="invite-info-row invite-text">
                            <span>Muutettu:</span>
                            <span> {formatDate(invite.updated_at)}</span>
                        </div>
                    </div>
                    <div className='invite-link-row'>
                        {qrData && (
                            /* QR code */
                            <div className="qr-card">
                                <div className="qr-image-wrapper">
                                    <img src={qrData} alt="QR code" className="qr-image" onClick={() => setZoomSrc(qrData)} />
                                </div>

                                <div className="qr-actions">
                                    <a
                                        className={`qr-btn-download ${downloaded ? "downloaded" : ""}`}
                                        href={qrData}
                                        download="lukudiplomi-kutsu-qr.png"
                                        onClick={() => {
                                            setDownloaded(true)
                                            setTimeout(() => setDownloaded(false), 300)
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                                            <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                        </svg>
                                    </a>
                                    {typeof navigator.share === "function" && (
                                        <button className={`qr-btn-share ${shared ? "shared" : ""}`} onClick={shareQRcode}>
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 840" width="24px" fill="#000000">
                                                <path d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T720-200q0-17-11.5-28.5T680-240q-17 0-28.5 11.5T640-200q0 17 11.5 28.5T680-160ZM200-440q17 0 28.5-11.5T240-480q0-17-11.5-28.5T200-520q-17 0-28.5 11.5T160-480q0 17 11.5 28.5T200-440Zm508.5-291.5Q720-743 720-760t-11.5-28.5Q697-800 680-800t-28.5 11.5Q640-777 640-760t11.5 28.5Q663-720 680-720t28.5-11.5ZM680-200ZM200-480Zm480-280Z"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="link-display">
                                {/* Link + Copy button */}
                                <button className={`copy-button ${copied ? "copied" : ""}`} onClick={copyLink} aria-label="Kopioi linkki">
                                    {copied ? (
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" height="26px" viewBox="0 -960 960 960" width="26px" fill="#000000">
                                            <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
                                        </svg>
                                    )}
                                </button>
                                <div className="link-text">{fullUrl}</div>
                            </div>

                            <div className="invite-toolbar">
                                {/* New link button + Enable/Disable button */}
                                <button className="regen-btn" onClick={regenerateInvite}>
                                    Uusi Linkki
                                </button>
                                <button className={invite.active ? "reject-button" : "accept-button"} onClick={toggleActive}>
                                    {invite.active ? "Poista käytöstä" : "Ota käyttöön"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {zoomSrc &&
                        createPortal(
                            <div className="zoom-overlay" onClick={() => setZoomSrc(null)}>
                                <img src={zoomSrc} className="zoom-img" alt="QR-koodi" />
                            </div>,
                            document.body
                        )}
                    {error && <p className="section-error">{error}</p>}
                </div>
            )}
        </div>
    )
}

export default InviteSection