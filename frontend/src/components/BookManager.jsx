import { useState, useEffect } from 'react'
import { fetchBooks, createBook } from '../services/api'

function BookManager() {
    const [books, setBooks] = useState([])
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [coverimage, setCoverimage] = useState('')
    const [booktype, setBooktype] = useState('physical')
    const [error, setError] = useState('')

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
        try {
            const res = await createBook({ title, author, coverimage, booktype })
            setTitle('')
            setAuthor('')
            setCoverimage('')
            setBooktype('physical')
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
                            <th>Nimi</th>
                            <th>Kirjoittaja</th>
                            <th>Tyyppi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((b) => (
                            <tr key={b.id}>
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

            <form className="add-form" onSubmit={handleAdd}>
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
                <div className="form-group">
                    <label>
                        Kansikuva URL
                        <span className="section-error">*</span>
                    </label>
                    <input
                        type="text"
                        value={coverimage}
                        onChange={(e) => setCoverimage(e.target.value)}
                        required
                    />
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
