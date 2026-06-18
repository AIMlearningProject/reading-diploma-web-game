import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './TeacherProfileCard.css'
import { updateTeacherName } from '../services/api'

/* ── TeacherProfileCard ────────────────────────────────────── */
function TeacherProfileCard() {
    const { user } = useAuth()
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(user?.name || '')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => {
            setToast(null)
            if (type === 'success') window.location.reload()
        }, 1700)
    }

    const handleSave = async () => {
        const body = {}
        if (name.trim() !== (user?.name || '')) body.name = name.trim()

        if (Object.keys(body).length === 0) {
            setEditing(false)
            return
        }

        setSaving(true)
        try {
            await updateTeacherName(user.id, name.trim())
            showToast('Profiili päivitetty!')
        } catch (err) {
            showToast(err?.message || 'Yhteysvirhe')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setName(user?.name || '')
        setEditing(false)
    }

    return (
        <div className="dashboard-section profile-section">
            {toast && (
                <div className={`profile-toast profile-toast--${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <h2>Oma profiili</h2>

            {editing ? (
                <div className="profile-edit">
                    <div className="profile-field">
                        <label>Nimi</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="profile-input"
                        />
                    </div>

                    <div className="profile-edit-actions">
                        <button className="add-button" onClick={handleSave} disabled={saving}>
                            {saving ? 'Tallennetaan...' : 'Tallenna'}
                        </button>
                        <button className="cancel-button" onClick={handleCancel} disabled={saving}>
                            Peruuta
                        </button>
                    </div>
                </div>
            ) : (
                <div className="profile-view">
                    <div className="profile-info">
                        <p className="profile-name">{user?.name}</p>
                        <p className="profile-email">{user?.email}</p>
                        <button className="edit-profile-button" onClick={() => setEditing(true)}>
                            Muokkaa
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherProfileCard
