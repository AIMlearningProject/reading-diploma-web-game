import { useState, useEffect, useRef } from 'react'
import { fetchBooks, createBook } from '../services/api'

function BookManager() {
    const [books, setBooks] = useState([])
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [coverimage, setCoverimage] = useState(null)
    const [booktype, setBooktype] = useState('physical')
    const [error, setError] = useState('')
    const formRef = useRef(null)
    const fileInputRef = useRef(null)

    const fetchMyBooks = async () => {
        try {
            const res = await fetchBooks()
            setBooks(res)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    useEffect(() => {
        fetchMyBooks()
    }, [])

    const handleAdd = async (e) => {
        e.preventDefault()
        setError('')

        if (!coverimage) {
            setError("Lisää kuva kirjan kannesta");
            return;
        }

        const formData = new FormData()
        formData.append('title', title)
        formData.append('author', author)
        formData.append('coverimage', coverimage)
        formData.append('booktype', booktype)

        try {
            await createBook(formData)
            setTitle('')
            setAuthor('')
            setCoverimage(null)
            setBooktype('physical')
            formRef.current?.reset()
            fetchMyBooks()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const typeFi = {
        "physical": "Fyysinen",
        "e-book": "E-kirja",
        "audio": "Äänikirja"
    }

    return (
        <div className="dashboard-section">
            <h2>Kirjat</h2>
            {books.length > 0 ? (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Nimi</th>
                            <th>Kirjoittaja</th>
                            <th>Tyyppi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((b) => (
                            <tr key={b.id}>
                                <td>
                                    <img
                                        className="book-cover-thumb"
                                        src={b.coverimage}
                                        alt={b.title}
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </td>
                                <td data-label="Nimi"> {b.title}</td>
                                <td data-label="Kirjoittaja"> {b.author}</td>
                                <td data-label="Tyyppi">
                                    {typeFi[b.booktype] ?? b.booktype}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="empty-message">Ei kirjoja vielä.</p>
            )}

            <form className="add-form" encType="multipart/form-data" onSubmit={handleAdd} ref={formRef}>
                <div className="form-group">
                    <label>
                        Nimi
                        <span className="section-error">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>
                        Kirjoittaja
                        <span className="section-error">*</span>
                    </label>
                    <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group upload-field-group">
                    <label>
                        Kansikuva
                        <span className="section-error">*</span>
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverimage(e.target.files?.[0] ?? null)}
                        hidden
                    />
                    <button
                        className="upload-button"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {coverimage ? coverimage.name : 'Lisää kuva'}
                    </button>
                </div>
                <div className="form-group">
                    <label>Tyyppi</label>
                    <select
                        value={booktype}
                        onChange={(e) => setBooktype(e.target.value)}
                    >
                        <option value="physical">Fyysinen</option>
                        <option value="e-book">E-kirja</option>
                        <option value="audio">Äänikirja</option>
                    </select>
                </div>
                <button type="submit" className="add-button">Lisää kirja</button>
            </form>
            {error && <p className="section-error">{error}</p>}
        </div>
    )
}

export default BookManager
