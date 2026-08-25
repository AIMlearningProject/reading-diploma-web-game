import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchMyBooks, fetchBookReaders, createBook, deleteBook } from '../services/api'
import BookSearchBar from './BookSearchBar'
import { createPortal } from 'react-dom'

function BookManager() {
    const [books, setBooks] = useState([])
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [booktype, setBooktype] = useState('physical')
    const [pageCount, setPageCount] = useState('');
    const [error, setError] = useState('')
    const [zoomSrc, setZoomSrc] = useState(null);
    const [query, setQuery] = useState('');
    const [queryBooktype, setQueryBooktype] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 10;

    const formRef = useRef(null)

    const sorted = useMemo(() => {
        // Sorts books alphabetically by title
        return books.slice().toSorted((a, b) => {
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });
    }, [books]);

    // Returns the books found based on the search query
    const filtered = useMemo(() => {
        const q = (query || '').toLowerCase().trim();
        const base = q ? sorted.filter(b => (`${b.title} ${b.author}`).toLowerCase().includes(q)) : sorted;

        if (queryBooktype) return base.filter(b => b.booktype === queryBooktype);

        return base
    }, [sorted, query, queryBooktype]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageSlice = filtered.slice(page * pageSize, (page + 1) * pageSize);

    useEffect(() => setPage(0), [query, queryBooktype]);

    const fetchBookList = async () => {
        try {
            const res = await fetchMyBooks()
            setBooks(res)
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    useEffect(() => {
        fetchBookList()
    }, [])

    const handleAdd = async (e) => {
        e.preventDefault()
        setError('')

        const body = {
            title,
            author,
            booktype
        }
        if (booktype === 'physical') body.page_count = pageCount

        try {
            await createBook(body)
            setTitle('')
            setAuthor('')
            setBooktype('physical')
            setPageCount('')
            formRef.current?.reset()
            fetchBookList()
        } catch (err) {
            setError(err?.message || 'Yhteysvirhe')
        }
    }

    const handleDelete = async (id, bookTitle) => {
        const bookReaders = await fetchBookReaders(id)
        if (bookReaders.length > 0) {
            const studentNames = bookReaders.map(r => r.name).join(', ')
            if (!window.confirm(`HUOM! ${bookReaders.length} oppilasta lukee tätä kirjaa.

Jos poistat kirjan, he joilla lukeminen on kesken, joutuvat valitsemaan uuden kirjan.

Kirjaa lukevat oppilaat:
${studentNames}`)) return
        }

        if (!window.confirm(`Haluatko varmasti poistaa Kirjan "${bookTitle}"?`)) return
        try {
            await deleteBook(id)
            fetchBookList()
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
                <>
                    <BookSearchBar
                        query={query}
                        onQueryChange={(q) => {
                            setQuery(q);
                            setPage(0);
                        }}
                        role={"teacher"}
                        booktype={queryBooktype}
                        setBooktype={setQueryBooktype}
                        page={page}
                        totalPages={totalPages}
                        onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                        onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    />
                    {pageSlice.length > 0 ? (
                        <>
                            {/* Desktop view of book list */}
                            <table className="data-table desktop-book-list">
                                <thead>
                                    <tr>
                                        <th>Nimi</th>
                                        <th>Kirjoittaja</th>
                                        <th>Tyyppi</th>
                                        <th>Toiminnot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageSlice.map((b) => (
                                        <tr key={b.id} className="book-item-row">
                                            <td data-label="Nimi"> {b.title}</td>
                                            <td data-label="Kirjoittaja"> {b.author}</td>
                                            <td data-label="Tyyppi"> {typeFi[b.booktype] ?? b.booktype}</td>
                                            <td data-label="Toiminnot">
                                                <div className="row-actions">
                                                    <button
                                                        className="delete-button"
                                                        onClick={() => handleDelete(b.id, b.title)}
                                                    >
                                                        Poista
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {zoomSrc &&
                                createPortal(
                                    <div className="zoom-overlay" onClick={() => setZoomSrc(null)}>
                                        <img src={zoomSrc} className="zoom-img" alt="" />
                                    </div>,
                                    document.body
                                )}
                            {/* Mobile view of book list */}
                            <div className="mobile-book-list">
                                {pageSlice.map((b) => (
                                    <div className="mobile-book-item" key={b.id}>
                                        <div className="mobile-book-info">
                                            <div className="mobile-book-title">{b.title}</div>
                                            <div className="mobile-book-author">{b.author}</div>
                                            <div className="mobile-book-type">{typeFi[b.booktype] ?? b.booktype}</div>
                                        </div>
                                        <div className="row-actions mobile-delete-book">
                                            <button
                                                className="delete-button"
                                                onClick={() => handleDelete(b.id, b.title)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Pager */}
                            {totalPages > 1 && (
                                <div className='pager'>
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className={
                                            page === 0
                                                ? "pager-button sb-disabled"
                                                : "pager-button sb-teacher"
                                        }
                                    >
                                        {'<'}
                                    </button>

                                    <div className='pager-status'>
                                        {page + 1}/{totalPages}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className={
                                            page >= totalPages - 1
                                                ? "pager-button sb-disabled"
                                                : "pager-button sb-teacher"
                                        }
                                    >
                                        {'>'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                        Ei hakutuloksia.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </>
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

                {booktype === "physical" && (
                    <div className="form-group">
                        <label>
                            Sivumäärä <span className="section-error">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={pageCount}
                            onChange={(e) => setPageCount(e.target.value)}
                            required
                        />
                    </div>
                )}
                <button type="submit" className="add-button">Lisää kirja</button>
            </form>
            {error && <p className="section-error">{error}</p>}
        </div>
    )
}

export default BookManager