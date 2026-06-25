import { useState, useMemo, useEffect } from 'react';
import ReadingState from '../game/state.js';
import BookSearchBar from './BookSearchBar';

export default function BookListPanel({ mapKey, onSelect, onClose, pageSize = 10 }) {
    const allBooks = ReadingState.globalBooks || [];
    const completedBookIds = ReadingState.completedBookIds || {};
    const currentBookId = (ReadingState.mapSelectedBook || {})[mapKey] || null;
    const failedQuizBookIds = new Set(Object.values(ReadingState.levelsPendingResubmission || {}).filter(e => e?.pending).map(e => String(e.book)))

    const books = useMemo(() => allBooks.map(b => ({
        ...b,
        isCompleted: !!completedBookIds[b.id],
        isCurrent: b.id === currentBookId,
        progress: ReadingState.bookProgress[b.id] || 0,
        isFailedQuizBook: failedQuizBookIds.has(String(b.id))
    }
    )), [allBooks, completedBookIds, currentBookId]);

    const sorted = useMemo(() => {
        // Sorts the books by progress and current selection.
        // Books with 0 progress are sorted alphabetically.
        return books.slice().toSorted((a, b) => {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;

            const pa = Number(a.progress) || 0;
            const pb = Number(b.progress) || 0;

            if (pa === 0 && pb === 0) {
                return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            }

            return pb - pa;
        });
    }, [books]);

    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);

    const [hideRead, setHideRead] = useState(false);

    useEffect(() => setPage(0), [query]);

    const filtered = useMemo(() => {
        const q = (query || '').toLowerCase().trim();
        const base = q ? sorted.filter(b => (`${b.title} ${b.author}`).toLowerCase().includes(q)) : sorted;

        if (!hideRead) return base;

        // Exclude books that are completed OR have progress >= 100
        return base.filter(b => !(b.isCompleted || (Number(b.progress) >= 100)));
    }, [sorted, query, hideRead]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageSlice = filtered.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div style={styles.overlay}>
            <div style={styles.header}>
                <h3 style={styles.headerTitle}>Valitse kirja</h3>
            </div>
            <div style={styles.header}>
                <button onClick={onClose} style={styles.cancelButton}>X Peruuta</button>
            </div>
            <div style={styles.container}>
                <BookSearchBar
                    query={query}
                    onQueryChange={setQuery}
                    role={"student"}
                    page={page}
                    totalPages={totalPages}
                    onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                    onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    hideRead={hideRead}
                    onToggleHideRead={setHideRead}
                    styles={styles}
                />

                <div style={styles.list}>
                    {pageSlice.map(book => (
                        <div
                            key={book.id}
                            style={{
                                ...styles.bookRow,
                                ...(book.isCurrent && styles.bookRowCurrent),
                                ...(book.isCompleted && styles.bookRowCompleted),
                                ...(book.isFailedQuizBook &&
                                    (book.isCurrent
                                        ? styles.bookRowResubmit
                                        : { ...styles.bookRowResubmit, opacity: 0.7 }
                                    )
                                ),
                            }}
                            onClick={() => onSelect && onSelect(book)}
                        >
                            <img
                                src={book.coverimage}
                                alt={book.title}
                                style={styles.bookImg}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                }}
                            />
                            <div style={styles.bookInfo}>
                                <div style={styles.bookTitle}>{book.title}</div>
                                <div style={styles.bookAuthor}>{book.author}</div>
                            </div>

                            <div style={styles.bookActions}>
                                <div style={{
                                    ...styles.bookProgress,
                                    ...(book.isCompleted && styles.bookProgressDone),
                                    ...(book.isFailedQuizBook && styles.bookProgressResubmit)
                                }}>
                                    {book.isFailedQuizBook && book.progress >= 100
                                        ? 'EI LUETTU'
                                        : (book.isCompleted ? 'LUETTU' : `${book.progress} %`)
                                    }
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: '#0a192fcc',
        alignItems: 'center',
        justifyContent: 'flex-start',
        pointerEvents: 'auto',
    },

    container: {
        position: 'relative',
        width: '80%',
        maxWidth: 900,
        marginTop: 20,
        background: '#0a192f',
        color: '#fff',
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    },

    header: {
        position: 'relative',
        top: 10,
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'auto',
        width: '80%',
        maxWidth: 900,
        padding: '6px 12px',
        background: 'transparent',
    },

    headerTitle: {
        fontSize: 20,
        margin: 0,
        color: '#d4af37',
        fontFamily: 'Cinzel Decorative, serif',
    },

    cancelButton: {
        background: '#1e3a5f',
        color: '#fff',
        border: 'none',
        padding: '6px 12px',
        borderRadius: 4,
        cursor: 'pointer',
    },

    searchRow: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
    },

    searchInput: {
        flex: 1,
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid #ccc'
    },

    pager: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginBottom: 12,
    },

    pagerButton: {
        padding: '4px 8px',
        cursor: 'pointer',
        color: '#9c9c9c',
        backgrounColor: 'transparent',
        border: '1px solid #9c9c9c',
        borderRadius: 4,
        textAlign: 'center',
        fontWeight: 'bold',
    },

    pagerStatus: {
        minWidth: 30,
        textAlign: 'center'
    },

    hideReadLabel: {
        display: 'inline-flex',
        alignItems: 'center',
        color: '#ffffff',
        cursor: 'pointer',
        userSelect: 'none'
    },

    hideReadCheckbox: {
        width: 20,
        height: 20,
        cursor: 'pointer'
    },

    hideReadText: {
        fontSize: 14
    },

    list: {
        maxHeight: '60vh',
        overflowY: 'auto',
        padding: '0px 4px',
    },

    bookRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        background: '#1e3a5f',
        marginBottom: 8,
        borderRadius: 6,
        transition: 'background 0.2s',
        border: '2px solid #d4af37',
        cursor: 'pointer',
        gap: '12px',
    },

    bookRowCurrent: {
        background: '#2d4a77',
        border: '2px solid #ffffff'
    },

    bookRowCompleted: {
        opacity: 0.7,
        border: '2px solid #4a5568'
    },

    bookRowResubmit: {
        background: '#7041d7b5',
    },

    bookImg: {
        width: '45px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
    },

    bookInfo: {
        flex: 1
    },

    bookTitle: {
        fontSize: 16,
        fontWeight: 700
    },

    bookAuthor: {
        fontSize: 13,
        color: '#e6d8b8'
    },

    bookActions: {
        display: 'flex',
        alignItems: 'center',
    },

    bookProgress: {
        fontWeight: 'bold',
        color: '#d4af37',
    },

    bookProgressDone: {
        color: '#00ff88'
    },

    bookProgressResubmit: {
        color: '#ffffff',
    },
};