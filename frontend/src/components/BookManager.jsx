import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchBooks, createBook } from '../services/api'
import BookSearchBar from './BookSearchBar'

function BookManager() {
    const [books, setBooks] = useState([])
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [coverimage, setCoverimage] = useState(null)
    const [booktype, setBooktype] = useState('physical')
    const [error, setError] = useState('')
    const formRef = useRef(null)
    const fileInputRef = useRef(null)

    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 10;

    const sorted = useMemo(() => {
        // Sorts books alphabetically by title
        return books.slice().toSorted((a, b) => {
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });
    }, [books]);

    const filtered = sorted.filter(b =>
        `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageSlice = filtered.slice(page * pageSize, (page + 1) * pageSize);

    const isPrevPagerBtnDisabled = page === 0;
    const isNextPagerBtnDisabled = page >= totalPages - 1;

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
                <>
                    <BookSearchBar
                        query={query}
                        onQueryChange={(q) => {
                            setQuery(q);
                            setPage(0);
                        }}
                        role={"teacher"}
                        page={page}
                        totalPages={totalPages}
                        onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                        onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        styles={styles}
                    />
                    {pageSlice.length > 0 ? (
                        <>
                            <table className="data-table desktop-book-list">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Nimi</th>
                                        <th>Kirjoittaja</th>
                                        <th>Tyyppi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageSlice.map((b) => (
                                        <tr key={b.id}>
                                            <td>
                                                <img
                                                    className="book-cover-thumb"
                                                    src={b.coverimage}
                                                    alt={b.title}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                        e.currentTarget.style.width = "0";
                                                        e.currentTarget.style.height = "0";
                                                    }}
                                                />
                                            </td>
                                            <td data-label="Nimi"> {b.title}</td>
                                            <td data-label="Kirjoittaja"> {b.author}</td>
                                            <td data-label="Tyyppi"> {typeFi[b.booktype] ?? b.booktype}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mobile-book-list">
                                {pageSlice.map((b) => (
                                    <div className="mobile-book-item" key={b.id}>
                                        <img
                                            className="mobile-book-cover"
                                            src={b.coverimage}
                                            alt={b.title}
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                            }}
                                        />

                                        <div className="mobile-book-info">
                                            <div className="mobile-book-title">{b.title}</div>
                                            <div className="mobile-book-author">{b.author}</div>
                                            <div className="mobile-book-type">{typeFi[b.booktype] ?? b.booktype}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Bottom pager buttons < X/X > */}
                            <div style={styles.pager}>
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    style={isPrevPagerBtnDisabled ? ({
                                        ...styles.pagerButton,
                                        cursor: 'default'
                                    }) : ({
                                        ...styles.pagerButton,
                                        cursor: 'pointer',
                                        backgroundColor: 'transparent',
                                        color: '#9E7A2A',
                                        border: '1px solid #9E7A2A',
                                    })}
                                >
                                    {'<'}
                                </button>

                                <div style={styles.pagerStatus}>
                                    {page + 1}/{totalPages}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    style={isNextPagerBtnDisabled ? ({
                                        ...styles.pagerButton,
                                        cursor: 'default'
                                    }) : ({
                                        ...styles.pagerButton,
                                        cursor: 'pointer',
                                        backgroundColor: 'transparent',
                                        color: '#9E7A2A',
                                        border: '1px solid #9E7A2A',
                                    })}
                                >
                                    {'>'}
                                </button>
                            </div>
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

const styles = {
    container: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        pointerEvents: 'auto',
        marginBottom: 12,
        gap: 12,
    },
    searchRow: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        pointerEvents: 'auto',
        marginBottom: 12,
        gap: 12,
    },
    searchInput: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid #ccc'
    },
    pager: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 },
    pagerStatus: { minWidth: 30, textAlign: 'center' },
    pagerButton: {
        padding: '4px 8px',
        color: '#9c9c9c',
        border: '1px solid #9c9c9c',
        borderRadius: 4,
        textAlign: 'center',
        fontWeight: 'bold',
    },
}