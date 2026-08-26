import { useState, useRef } from 'react';
import { createBook } from '../../services/api'
import ReadingState from '../../game/state';
import InfoButton from '../InfoButton'
import './AddBookPopup.css'

function AddBookPopup({ open, onClose, onSelect, mapKey }) {
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [booktype, setBooktype] = useState('physical')
    const [pageCount, setPageCount] = useState('');
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false);

    const formRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

         const body = {
            title,
            author,
            booktype
        }
        if (booktype === 'physical') body.page_count = pageCount

        try {
            const createdBook = await createBook(body)

            setTitle('')
            setAuthor('')
            setBooktype('physical')
            setPageCount('')
            formRef.current?.reset()

            const newBook = {
                title: createdBook.title,
                author: createdBook.author,
                type: createdBook.booktype,
                id: String(createdBook.id),
                pageCount: createdBook.page_count
            }

            ReadingState.globalBooks = [...(ReadingState.globalBooks || []), newBook]
            ReadingState.mapSelectedBook[mapKey] = newBook.id

            onClose()
            onSelect(mapKey, newBook)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="student-add-book-overlay" onClick={onClose}>
            <div className="student-add-book-panel" onClick={(e) => e.stopPropagation()}>
                <div className="student-add-book-header">
                    <h2>Lisää kirja</h2>
                    <div>
                        <InfoButton
                            info={'Jos et löydä listasta kirjaa, jota haluat lukea, voit lisätä sen täällä itse. Kirjan lisääminen ei anna sinulle kirjaa, vaan se lisätään näkymään luokan yhteiseen listaan.'}
                            buttonStyle={{
                                marginRight: '10px',
                                fontSize: '16px',
                                fontWeight: '700',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                            }}
                        />
                        <button className="student-add-book-close-btn" onClick={onClose}>
                            X Sulje
                        </button>
                    </div>
                </div>

                <form
                    className="student-add-book-form"
                    encType="multipart/form-data"
                    onSubmit={handleSubmit}
                    ref={formRef}
                >
                    <div className="student-add-book-form-group group-title">
                        <label>
                            <div>Kirjan nimi <span className="popup-section-error">*</span></div>
                            <textarea
                                name="book-title"
                                type="textarea"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="student-add-book-textarea"
                                rows={3}
                                required
                            />
                        </label>
                    </div>

                    <div className="student-add-book-form-group">
                        <label>
                            <div>Kirjoittaja <span className="popup-section-error">*</span></div>
                            <input
                                name="book-author"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="student-add-book-small-row">
                        <div className="student-add-book-form-group">
                            <label>
                                Tyyppi
                                <select
                                    name="book-type"
                                    value={booktype}
                                    onChange={(e) => setBooktype(e.target.value)}
                                >
                                    <option value="physical">Fyysinen</option>
                                    <option value="e-book">E-kirja</option>
                                    <option value="audio">Äänikirja</option>
                                </select>
                            </label>
                        </div>

                        {booktype === "physical" && (
                            <div className="student-add-book-form-group">
                                <label>
                                    <div>Sivumäärä <span className="popup-section-error">*</span></div>
                                    <input
                                        name="book-page-count"
                                        className="page-count-input"
                                        type="number"
                                        min="1"
                                        value={pageCount}
                                        onChange={(e) => setPageCount(e.target.value)}
                                        required
                                    />
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="student-add-book-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="add-book-loading-spinner" />
                            ) : (
                                "Lisää kirja"
                            )}
                            
                        </button>
                    </div>
                </form>
                {error && <p className="popup-section-error">{error}</p>}
            </div>
        </div>
    );
}

export default AddBookPopup