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

    styles
}) {
    const isPrevDisabled = page === 0;
    const isNextDisabled = page >= totalPages - 1;

    return (
        <div>
            {/* Search input */}
            <div style={styles.searchRow}>
                <input
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    placeholder="Hae kirjaa tai tekijää"
                    style={styles.searchInput}
                />
            </div>

            {/* Pager always shown when pager props exist */}
            <div className="pagerRow" style={styles.pagerRow}>
                <div style={styles.pager}>
                    <button
                        onClick={onPrevPage}
                        disabled={isPrevDisabled}
                        style={
                            isPrevDisabled ? ({
                                ...styles.pagerButton,
                                cursor: 'default'
                            }) : (role === "teacher" ? ({
                                ...styles.pagerButton,
                                cursor: 'pointer',
                                backgroundColor: 'transparent',
                                color: '#9E7A2A',
                                border: '1px solid #9E7A2A',
                            }) : ({
                                ...styles.pagerButton,
                                cursor: 'pointer'
                            }))
                        }
                    >
                        {'<'}
                    </button>

                    <div style={styles.pagerStatus}>
                        {page + 1}/{totalPages}
                    </div>
                    <button
                        onClick={onNextPage}
                        disabled={isNextDisabled}
                        style={
                            isNextDisabled ? ({
                                ...styles.pagerButton,
                                cursor: 'default'
                            }) : (role === "teacher" ? ({
                                ...styles.pagerButton,
                                cursor: 'pointer',
                                backgroundColor: 'transparent',
                                color: '#9E7A2A',
                                border: '1px solid #9E7A2A',
                            }) : ({
                                ...styles.pagerButton,
                                cursor: 'pointer'
                            }))
                        }
                    >
                        {'>'}
                    </button>
                </div>

                {/* Filter by booktype */}
                <select
                    value={booktype}
                    onChange={(e) => setBooktype(e.target.value)}
                    style={styles.booktypeSelect}
                >
                    <option value="">Kaikki</option>
                    <option value="physical">Fyysiset</option>
                    <option value="e-book">E-kirjat</option>
                    <option value="audio">Äänikirjat</option>
                </select>

                {/* Hide-read only if props exist */}
                {hideRead !== undefined && (
                    <label style={styles.hideReadLabel}>
                        <input
                            type="checkbox"
                            checked={hideRead}
                            onChange={e => onToggleHideRead(e.target.checked)}
                            style={styles.hideReadCheckbox}
                        />
                        <span style={styles.hideReadText}>Piilota luetut</span>
                    </label>
                )}
            </div>
        </div>
    );
}
