import { useState } from 'react'
import {
    deleteCurrentTeacher,
    deleteAllMyStudents
} from '../services/api'
import './TransferRequestPopup.css'

function AccountDeletionPopup({ open, onClose, setShowTransferPopup }) {
    const [toast, setToast] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => {
            setToast(null)
            if (type === 'success') {
                window.location.reload()
            }
        }, 1700)
    }

    const handleDelete = async () => {
        if (!window.confirm(`Haluatko varmasti poistaa Käyttäjäsi? Menetät kaikki käyttäjätietosi ja kaikki oppilaitesi tiedot poistetaan.`)) return
        try {
            await deleteAllMyStudents()
            await deleteCurrentTeacher()
            showToast('Käyttäjä ja oopilaat poistettu!')
        } catch (err) {
            showToast(err?.message || 'Yhteysvirhe')
        }
    }

    const handleTransfer = () => {
        onClose()
        setShowTransferPopup(true)
    }

    if (!open) return null;

    return (
        <div className="tr-popup-overlay">
            <div className="tr-popup-window">
                <button className="tr-popup-close" onClick={onClose}>
                    ✕
                </button>
                {toast && (
                    <div className={`profile-toast profile-toast--${toast.type}`}>
                        {toast.message}
                    </div>
                )}
                <div className="dashboard-section profile-edit-actions" style={{ justifyContent: 'center' }}>
                    <span>
                        ⚠️ HUOM! Lue tämä ennen käyttäjän poistamista! ⚠️
                    </span>
                    <span>
                        <p>Ennen kuin poistat käyttäjäsi, voit valita siirrätkö oppilaitesi käyttäjät toiselle opettajalle. Jos poistat käyttäjäsi siirtämättä oppilaitasi, kaikki lisäämäsi oppilastiedot poistetaan käyttäjätietosi mukana.</p>
                        <p>Alla olevasta painikkeesta voit lähettää toiselle opettajalle pyynnön ottaa oppilaasi vastaan.</p>
                        <p>Vasta toisen opettajan hyväksyttyä pyyntösi, oppilaitesi käyttäjätiedot ja edistyminen säilyvät hänen käyttäjän alla.</p>
                        <p>Kaikkien siirtämättömien oppilaitesi käyttäjätiedot poistetaan, kun poistat käyttäjäsi!</p>
                    </span>
                    <button className="open-transfer-requests-button" onClick={handleTransfer}>
                        Siirrä oppilaat
                    </button>
                    <button className="delete-profile-button" onClick={handleDelete}>
                        Poista Käyttäjä
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AccountDeletionPopup
