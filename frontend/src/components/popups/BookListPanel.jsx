import { useState, useMemo, useEffect } from 'react';
import ReadingState from '../../game/state.js';
import BookSearchBar from '../BookSearchBar.jsx';
import AddBookPopup from './AddBookPopup.jsx';
import './BookListPanel.css'

export default function BookListPanel({ mapKey, nodeIndex = 1, onSelect, onClose, pageSize = 10 }) {
    const [query, setQuery] = useState('');
    const [queryBooktype, setQueryBooktype] = useState('');
    const [page, setPage] = useState(0);
    const [hideRead, setHideRead] = useState(false);
    const [showAddBookPopup, setShowAddBookPopup] = useState(false)
    // Set when the chosen row does not name a single book and the pupil still
    // has to say which one they are reading.
    const [pendingBook, setPendingBook] = useState(null);

    // Only the books this continent offers: the groups of the pupil's own year
    // that are mapped to it, plus everything their class added themselves.
    // Books already taken by another stop on this continent's route are out.
    const allBooks = ReadingState.booksForContinent(mapKey, nodeIndex);
    const nodeCount = ReadingState.nodesFor(mapKey).length;
    const genre = ReadingState.genreFor(mapKey);
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
        // Searching has to reach the individual titles of a row that lists
        // several, or "Momo" would not find "Tarina vailla loppua tai Momo".
        base = q
            ? sorted.filter(b => (`${b.title} ${b.author} ${(b.altTitles || []).join(' ')}`).toLowerCase().includes(q))
            : sorted;

        if (queryBooktype) base = base.filter(b => b.type === queryBooktype);

        // Exclude books that are completed OR have progress >= 100
        if (hideRead) base = base.filter(b => !b.isCompleted);

        return base;
    }, [sorted, query, queryBooktype, hideRead]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageSlice = filtered.slice(page * pageSize, (page + 1) * pageSize);

    const hasReadBooks = useMemo(() => books.some(b => b.isCompleted), [books]);

    const chooseBook = (book) => {
        if (book.needsTitleInput && !book.isCompleted) {
            setPendingBook(book);
            return;
        }
        onSelect && onSelect(mapKey, book);
    };

    if (showAddBookPopup) return (
        <AddBookPopup
            open={showAddBookPopup}
            onClose={() => setShowAddBookPopup(false)}
            onSelect={onSelect}
            mapKey={mapKey}
        />
    )

    if (pendingBook) return (
        <ChooseTitlePanel
            book={pendingBook}
            onCancel={() => setPendingBook(null)}
            onConfirm={(readTitle) => {
                setPendingBook(null);
                onSelect && onSelect(mapKey, { ...pendingBook, readTitle });
            }}
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
                <div>
                    <h3 className='booklist-header-title'>
                        Valitse kirja &mdash; etappi {nodeIndex}/{nodeCount}
                    </h3>
                    <p className='booklist-header-genre'>{genre.label}</p>
                </div>
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
                                onClick={() => chooseBook(book)}
                                className={rowClasses}
                                style={{ ...(book.isFailedQuizBook && !book.isCurrent && { opacity: 0.7 }) }}
                            >
                                <div className='book-info'>
                                    <div className='book-row-title'>{book.title}</div>
                                    <div className='book-row-author'>
                                        {book.author}
                                        {book.source === 'custom' && (
                                            <span className='book-row-tag'>oma lisäys</span>
                                        )}
                                    </div>
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
                    {pageSlice.length === 0 && (
                        <p className='booklist-empty'>Tälle mantereelle ei löytynyt kirjoja.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * The library's lists often give a choice rather than one book -- "Tarina vailla
 * loppua tai Momo", or a whole series. The pupil picks or types the book they
 * actually read, and that is what the teacher sees on the level.
 */
function ChooseTitlePanel({ book, onCancel, onConfirm }) {
    const alternatives = book.altTitles || [];
    const [picked, setPicked] = useState(alternatives.length === 1 ? alternatives[0] : '');
    const [typed, setTyped] = useState('');

    const value = (picked || typed).trim();

    return (
        <div
            className='game-overlay'
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <div className='booklist-header'>
                <h3 className='booklist-header-title'>Mitä kirjaa luet?</h3>
                <button className='close-booklist-button' onClick={onCancel}>X Peruuta</button>
            </div>
            <div className='booklist-container choose-title'>
                <p className='choose-title-printed'>{book.title}</p>
                {book.author && <p className='choose-title-author'>{book.author}</p>}

                {alternatives.length > 0 && (
                    <div className='choose-title-options'>
                        {alternatives.map(title => (
                            <button
                                key={title}
                                type='button'
                                className={picked === title ? 'choose-title-chip is-picked' : 'choose-title-chip'}
                                onClick={() => { setPicked(title); setTyped(''); }}
                            >
                                {title}
                            </button>
                        ))}
                    </div>
                )}

                {book.seriesNote && (
                    <p className='choose-title-note'>
                        Voit lukea myös: {book.seriesNote}. Kirjoita silloin kirjan nimi alle.
                    </p>
                )}

                <label className='choose-title-label' htmlFor='choose-title-input'>
                    Kirjan nimi
                </label>
                <input
                    id='choose-title-input'
                    className='choose-title-input'
                    type='text'
                    maxLength={200}
                    value={typed}
                    placeholder='Kirjoita lukemasi kirjan nimi'
                    onChange={(e) => { setTyped(e.target.value); setPicked(''); }}
                />

                <div className='choose-title-actions'>
                    <button
                        type='button'
                        className='choose-title-confirm'
                        disabled={!value}
                        onClick={() => onConfirm(value)}
                    >
                        Valitse
                    </button>
                </div>
            </div>
        </div>
    );
}
