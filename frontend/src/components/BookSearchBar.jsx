import './BookSearchBar.css';

export default function SearchBar({
    query,
    onQueryChange,
    role,
    booktype,
    setBooktype,

    // Pager
    page,
    totalPages,
    onPrevPage,
    onNextPage,

    // Optional hide-read toggle (only BookListPanel uses this)
    hideRead,
    onToggleHideRead,
    hasReadBooks,
    onAddBook
}) {
    const isPrevDisabled = page === 0;
    const isNextDisabled = page >= totalPages - 1;
    // The pupil's panel draws its buttons in ink (ink.css); the teacher's do not.
    const ink = role === 'student' ? ' ink-shape ink-shape--thin ink-drop' : '';
    // Its fields are ruled in ink too. A plain call, not a component: a
    // component defined here would be a new type on every render and remount
    // the field, which loses its focus while the pupil types.
    const inkField = (field, extra = '') => role === 'student'
        ? <span className={`ink-field${extra}`}>{field}</span>
        : field;

    return (
        <div>
            {/* Search input */}
            <div className='search-row'>
                {inkField(
                    <input
                        className='search-input'
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        placeholder="Hae kirjaa tai tekijää"
                    />,
                    ' sb-search-field'
                )}
            </div>

            <div className="pager-row">
                {/* Filter by booktype */}
                {inkField(
                    <select
                        value={booktype}
                        onChange={(e) => setBooktype(e.target.value)}
                        className={role === "student"
                            ? "booktype-select sb-student"
                            : "booktype-select"}
                    >
                        <option value="">Kaikki</option>
                        <option value="physical">Fyysiset</option>
                        <option value="e-book">E-kirjat</option>
                        <option value="audio">Äänikirjat</option>
                    </select>,
                    ' ink-field--select'
                )}

                {/* Hide-read checkbox */}
                {role === 'student' && (
                    <>
                        {hasReadBooks && (
                            <label className='hide-read-label'>
                                <input
                                    type="checkbox"
                                    checked={hideRead}
                                    onChange={e => onToggleHideRead(e.target.checked)}
                                    className='hide-read-checkbox ink-check'
                                />
                                <span className='hide-read-text'>Piilota luetut</span>
                            </label>
                        )}

                        <button className={`add-book-btn${ink}`} onClick={onAddBook}>
                            Lisää kirja
                        </button>
                    </>
                )}

                {/* Pager */}
                {totalPages > 1 && (
                    <div className='pager'>
                        <button
                            onClick={onPrevPage}
                            disabled={isPrevDisabled}
                            className={(
                                isPrevDisabled
                                    ? "pager-button sb-disabled"
                                    : role === "teacher"
                                        ? "pager-button sb-teacher"
                                        : "pager-button"
                            ) + ink}
                        >
                            {'<'}
                        </button>

                        <div className='pager-status'>
                            {page + 1}/{totalPages}
                        </div>

                        <button
                            onClick={onNextPage}
                            disabled={isNextDisabled}
                            className={(
                                isNextDisabled
                                    ? "pager-button sb-disabled"
                                    : role === "teacher"
                                        ? "pager-button sb-teacher"
                                        : "pager-button"
                            ) + ink}
                        >
                            {'>'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
