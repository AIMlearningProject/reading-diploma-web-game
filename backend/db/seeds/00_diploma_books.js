import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const catalogue = require('./data/diploma_books.json')

/**
 * The library's Kirja kantaa reading diploma book lists.
 *
 * Generated offline by build/diploma (fetch.py -> parse.py -> emit.py) from the
 * PDFs on ylivieska.fi and committed as data/diploma_books.json. Nothing here
 * touches the network, and the backend never parses a PDF.
 *
 * Idempotent: rows are matched on external_key, so re-running after the library
 * republishes a list updates the books in place and keeps their ids, which
 * matters because progress.book points at them. A book that has disappeared
 * from the lists is NOT deleted -- a pupil may be reading it right now. It is
 * left in place and simply stops being offered, which requires the caller to
 * pass { prune: true } to change.
 *
 * Safe to run against real data, unlike 01_test_data.js.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex, { quiet = false } = {}) {
    const { books, continents } = catalogue

    await knex.transaction(async (trx) => {
        // The continent map: one row per (continent, grade, category). A pair
        // with no row offers the grade's whole list instead.
        await trx('diploma_continents').del()
        const rows = []
        for (const continent of continents) {
            for (const [grade_band, info] of Object.entries(continent.grades)) {
                for (const category of info.categories) {
                    rows.push({ map_key: continent.key, grade_band, category })
                }
            }
        }
        await trx('diploma_continents').insert(rows)

        await trx('books')
            .insert(books.map((book) => ({
                source: 'diploma',
                external_key: book.external_key,
                grade_band: book.grade_band,
                category: book.category,
                title: book.title,
                author: book.author,
                booktype: 'physical',
                page_count: null,
                added_by: null,
                alt_titles: JSON.stringify(book.alt_titles),
                series_note: book.series_note,
                needs_title_input: book.needs_title_input
            })))
            .onConflict(knex.raw('(external_key) WHERE source = \'diploma\''))
            .merge([
                'grade_band', 'category', 'title', 'author',
                'alt_titles', 'series_note', 'needs_title_input'
            ])

        if (!quiet) {
            const stale = await trx('books')
                .where({ source: 'diploma' })
                .whereNotIn('external_key', books.map((book) => book.external_key))
                .count({ n: '*' })
                .first()
            const orphaned = Number(stale?.n ?? 0)
            console.log(
                `diploma catalogue: ${books.length} books, ${rows.length} continent slots` +
                (orphaned ? `, ${orphaned} book(s) no longer on any list (kept)` : '')
            )
        }
    })
}
