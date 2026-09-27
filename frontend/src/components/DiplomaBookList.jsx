import { useState, useEffect, useMemo } from 'react'
import { fetchDiplomaBooks } from '../services/api'
import { CONTINENT_BY_MAP_KEY, FREE_CHOICE_LABEL } from '../constants/continents'

/**
 * The library's Kirja kantaa book list, as a teacher sees it.
 *
 * Read-only on purpose: the list belongs to the library, and the game imports
 * it from their published PDFs. What a teacher needs here is to look up what
 * their pupils are being offered in a given year, and where in the game it sits.
 */

const PAGE_SIZE = 12

export default function DiplomaBookList({ grades = [], defaultGrade = 1 }) {
    const [grade, setGrade] = useState(defaultGrade)
    // The class's grades arrive after the first render, so the default only
    // becomes known a moment later. Follow it until the teacher picks a grade
    // themselves, after which it is theirs.
    const [hasChosenGrade, setHasChosenGrade] = useState(false)
    const [catalogue, setCatalogue] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [query, setQuery] = useState('')
    const [mapKey, setMapKey] = useState('')
    const [page, setPage] = useState(0)

    useEffect(() => {
        // Switching grade mid-request must not let the slower answer win.
        let isStale = false
        const load = async () => {
            setLoading(true)
            setError('')
            try {
                const res = await fetchDiplomaBooks(grade)
                if (!isStale) setCatalogue(res)
            } catch (err) {
                if (!isStale) setError(err?.message || 'Yhteysvirhe')
            } finally {
                if (!isStale) setLoading(false)
            }
        }
        load()
        return () => { isStale = true }
    }, [grade])

    useEffect(() => {
        if (!hasChosenGrade) setGrade(defaultGrade)
    }, [defaultGrade, hasChosenGrade])

    useEffect(() => setPage(0), [query, mapKey, grade])

    const books = catalogue?.books ?? []

    // What each continent stands for in this grade. A continent with no group
    // of its own offers the whole year's list instead.
    const continentGroups = useMemo(() => {
        const slots = catalogue?.continents ?? []
        return Object.values(CONTINENT_BY_MAP_KEY).map((continent) => {
            const categories = slots
                .filter((slot) => slot.map_key === continent.mapKey)
                .map((slot) => slot.category)
            return {
                ...continent,
                categories,
                label: categories.length > 0 ? categories.join(' / ') : FREE_CHOICE_LABEL,
                free: categories.length === 0,
                count: categories.length > 0
                    ? books.filter((book) => categories.includes(book.category)).length
                    : books.length
            }
        }).toSorted((a, b) => a.level - b.level)
    }, [catalogue, books])

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim()
        let base = books
        if (mapKey) {
            const chosen = continentGroups.find((c) => c.mapKey === mapKey)
            // A free-choice continent offers everything, so it filters nothing.
            if (chosen && !chosen.free) {
                base = base.filter((book) => chosen.categories.includes(book.category))
            }
        }
        if (q) {
            // Search has to reach the individual titles of a row that lists
            // several, or "Momo" would not find "Tarina vailla loppua tai Momo".
            base = base.filter((book) => (
                `${book.title} ${book.author} ${(book.alt_titles || []).join(' ')}`
            ).toLowerCase().includes(q))
        }
        return base
    }, [books, query, mapKey, continentGroups])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const gradeOptions = grades.length > 0 ? grades : [1, 2, 3, 4, 5, 6, 7, 8, 9]

    return (
        <div className="diploma-books">
            <p className="diploma-books-intro">
                Kirjalista tulee kirjaston Kirja kantaa -lukudiplomista. Oppilas näkee oman
                luokka-asteensa listan, eikä sitä muokata täällä.
            </p>

            <div className="diploma-books-controls">
                <label className="diploma-books-field">
                    <span>Luokka-aste</span>
                    <select
                        value={grade}
                        onChange={(e) => { setHasChosenGrade(true); setGrade(Number(e.target.value)) }}
                    >
                        {gradeOptions.map(g => (
                            <option key={g} value={g}>{g}. luokka</option>
                        ))}
                    </select>
                </label>

                <label className="diploma-books-field">
                    <span>Manner</span>
                    <select value={mapKey} onChange={(e) => setMapKey(e.target.value)}>
                        <option value="">Kaikki</option>
                        {continentGroups.map(c => (
                            <option key={c.mapKey} value={c.mapKey}>
                                {c.level}. {c.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="diploma-books-field diploma-books-search">
                    <span>Hae</span>
                    <input
                        type="search"
                        value={query}
                        placeholder="Hae kirjaa tai tekijää"
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
            </div>

            {error && <p className="section-error">{error}</p>}

            {loading ? (
                <p className="empty-message">Ladataan kirjalistaa...</p>
            ) : (
                <>
                    <div className="diploma-books-summary">
                        <strong>{filtered.length}</strong> kirjaa
                        {filtered.length !== books.length && <> / {books.length}</>}
                        {catalogue?.gradeBand && <> &middot; lista {catalogue.gradeBand}</>}
                    </div>

                    {!mapKey && (
                        <ul className="continent-chip-list">
                            {continentGroups.map(c => (
                                <li key={c.mapKey}>
                                    <button
                                        type="button"
                                        className={`continent-chip ${c.free ? 'continent-chip--free' : ''}`}
                                        onClick={() => setMapKey(c.mapKey)}
                                    >
                                        <span className="continent-chip-level">{c.level}</span>
                                        <span className="continent-chip-body">
                                            <strong>{c.name}</strong>
                                            <span>{c.label}</span>
                                        </span>
                                        <span className="continent-chip-count">{c.count}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {pageSlice.length > 0 ? (
                        <table className="data-table diploma-books-table">
                            <thead>
                                <tr>
                                    <th>Nimi</th>
                                    <th>Kirjoittaja</th>
                                    <th>Ryhmä</th>
                                    <th>Manner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageSlice.map(book => {
                                    const continent = CONTINENT_BY_MAP_KEY[book.map_key]
                                    return (
                                        <tr key={book.id}>
                                            <td data-label="Nimi">
                                                {book.title}
                                                {book.needs_title_input && (
                                                    <span
                                                        className="diploma-books-flag"
                                                        title="Rivi ei nimeä yhtä kirjaa. Oppilas kirjoittaa pelissä, minkä kirjan hän luki."
                                                    >
                                                        valinta
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Kirjoittaja">{book.author || '—'}</td>
                                            <td data-label="Ryhmä">{book.category}</td>
                                            <td data-label="Manner">
                                                {continent ? `${continent.level}. ${continent.name}` : FREE_CHOICE_LABEL}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="empty-message">Haulla ei löytynyt kirjoja.</p>
                    )}

                    {totalPages > 1 && (
                        <div className="diploma-books-pager">
                            <button
                                type="button"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                &lt;
                            </button>
                            <span>{page + 1} / {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
