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

    return (
        <div>
            {/* Search input */}
            <div className='search-row'>
                <input
                    className='search-input'
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    placeholder="Hae kirjaa tai tekijää"
                />
            </div>

            <div className="pager-row">
                {/* Filter by booktype */}
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
                </select>

                {/* Hide-read checkbox */}
                {role === 'student' && (
                    <>
                        {hasReadBooks && (
                            <label className='hide-read-label'>
                                <input
                                    type="checkbox"
                                    checked={hideRead}
                                    onChange={e => onToggleHideRead(e.target.checked)}
                                    className='hide-read-checkbox'
                                />
                                <span className='hide-read-text'>Piilota luetut</span>
                            </label>
                        )}

                        <button className='add-book-btn' onClick={onAddBook}>
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
                            className={
                                isPrevDisabled
                                    ? "pager-button sb-disabled"
                                    : role === "teacher"
                                        ? "pager-button sb-teacher"
                                        : "pager-button"
                            }
                        >
                            {'<'}
                        </button>

                        <div className='pager-status'>
                            {page + 1}/{totalPages}
                        </div>

                        <button
                            onClick={onNextPage}
                            disabled={isNextDisabled}
                            className={
                                isNextDisabled
                                    ? "pager-button sb-disabled"
                                    : role === "teacher"
                                        ? "pager-button sb-teacher"
                                        : "pager-button"
                            }
                        >
                            {'>'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
