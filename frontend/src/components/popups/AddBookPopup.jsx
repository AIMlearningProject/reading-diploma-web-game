import { useState, useRef } from "react";
import { createBook } from '../../services/api'
import ReadingState from "../../game/state";
import './AddBookPopup.css'

function AddBookPopup({ open, onClose, mapKey }) {
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [coverimage, setCoverimage] = useState(null)
    const [booktype, setBooktype] = useState('physical')
    const [pageCount, setPageCount] = useState('');
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false);

    const formRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const formData = new FormData()
        formData.append('title', title)
        formData.append('author', author)
        if (coverimage) formData.append('coverimage', coverimage)
        formData.append('booktype', booktype)
        if (booktype === 'physical') formData.append('page_count', pageCount)

        try {
            const createdBook = await createBook(formData)

            setTitle('')
            setAuthor('')
            setCoverimage(null)
            setBooktype('physical')
            setPageCount('')
            formRef.current?.reset()

            const newBook = {
                title: createdBook.title,
                author: createdBook.author,
                coverimage: createdBook.coverimage,
                type: createdBook.booktype,
                id: String(createdBook.id),
                pageCount: createdBook.page_count
            }

            ReadingState.globalBooks = [...(ReadingState.globalBooks || []), newBook]
            ReadingState.mapSelectedBook[mapKey] = newBook.id
            await ReadingState.saveBookSelection(mapKey, createdBook.id)

            onClose()
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
                    <button className="student-add-book-close-btn" onClick={onClose}>
                        X Sulje
                    </button>
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
                                Kansikuva
                                <input
                                    ref={fileInputRef}
                                    name="book-cover"
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) => setCoverimage(e.target.files?.[0] ?? null)}
                                />
                                <button
                                    type="button"
                                    className="student-add-book-upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {coverimage ? coverimage.name : "Lisää kuva"}
                                </button>
                            </label>
                        </div>

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