import { useState, useMemo, useEffect } from 'react';
import ReadingState from '../../game/state.js';
import BookSearchBar from '../BookSearchBar.jsx';
import AddBookPopup from './AddBookPopup.jsx';
import './BookListPanel.css'

export default function BookListPanel({ mapKey, onSelect, onClose, pageSize = 10 }) {
    const [query, setQuery] = useState('');
    const [queryBooktype, setQueryBooktype] = useState('');
    const [page, setPage] = useState(0);
    const [hideRead, setHideRead] = useState(false);
    const [showAddBookPopup, setShowAddBookPopup] = useState(false)

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
    )), [allBooks, completedBookIds, currentBookId, onSelect]);

    const sorted = useMemo(() => {
        // Sorts the books by progress and current selection.
        // Books with 0 progress are sorted alphabetically.
        return books.slice().toSorted((a, b) => {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;

            const pa = Number(a.progress) || 0;
            const pb = Number(b.progress) || 0;

            if (pa === 0 && pb === 0) {
                return a.title.localeCompare(b.title, 'fin', { sensitivity: 'base' });
            }

            return pb - pa;
        });
    }, [books]);

    useEffect(() => setPage(0), [query, queryBooktype]);

    // Returns the books found based on the search query
    const filtered = useMemo(() => {
        let base
        const q = (query || '').toLowerCase().trim();
        base = q ? sorted.filter(b => (`${b.title} ${b.author}`).toLowerCase().includes(q)) : sorted;

        if (queryBooktype) base = base.filter(b => b.type === queryBooktype);

        // Exclude books that are completed OR have progress >= 100
        if (hideRead) base = base.filter(b => !b.isCompleted);

        return base;
    }, [sorted, query, queryBooktype, hideRead]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageSlice = filtered.slice(page * pageSize, (page + 1) * pageSize);

    const hasReadBooks = useMemo(() => books.some(b => b.isCompleted), [books]);

    if (showAddBookPopup) return (
        <AddBookPopup
            open={showAddBookPopup}
            onClose={() => setShowAddBookPopup(false)}
            onSelect={onSelect}
            mapKey={mapKey}
        />
    )

    return (
        <div
            className='game-overlay'
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <div className='booklist-header'>
                <h3 className='booklist-header-title'>Valitse kirja</h3>
                <button className='close-booklist-button' onClick={onClose}>X Peruuta</button>
            </div>
            <div className='booklist-container'>
                <div className='book-searchbar'>
                    <BookSearchBar
                        query={query}
                        onQueryChange={setQuery}
                        role={"student"}
                        booktype={queryBooktype}
                        setBooktype={setQueryBooktype}
                        page={page}
                        totalPages={totalPages}
                        onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                        onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}

                        hideRead={hideRead}
                        onToggleHideRead={setHideRead}
                        hasReadBooks={hasReadBooks}
                        onAddBook={() => setShowAddBookPopup(true)}
                    />
                </div>
                <div className='booklist'>
                    {pageSlice.map(book => {
                        const rowClasses = [
                            "book-row",
                            book.isCurrent && "book-row-current",
                            book.isCompleted && "book-row-completed",
                            book.isFailedQuizBook && "book-row-resubmit"
                        ].filter(Boolean).join(" ");

                        const progressClasses = [
                            "book-progress",
                            book.isCompleted && "book-progress-done",
                            book.isFailedQuizBook && "book-progress-resubmit"
                        ].filter(Boolean).join(" ");
                        
                        return (
                            <div
                                key={book.id}
                                onClick={() => onSelect && onSelect(mapKey, book)}
                                className={rowClasses}
                                style={{ ...(book.isFailedQuizBook && !book.isCurrent && { opacity: 0.7 }) }}
                            >
                                <div className='book-info'>
                                    <div className='book-row-title'>{book.title}</div>
                                    <div className='book-row-author'>{book.author}</div>
                                </div>

                                <div className='book-actions'>
                                    <div className={progressClasses}>
                                        {book.isFailedQuizBook && book.progress >= 100
                                            ? 'EI LUETTU'
                                            : (book.isCompleted ? 'LUETTU' : `${book.progress} %`)
                                        }
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}