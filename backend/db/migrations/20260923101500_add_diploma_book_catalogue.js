/**
 * The books a pupil can choose from now come from the library's published
 * Kirja kantaa reading diploma instead of being typed in by a teacher.
 *
 * Diploma books live in the same `books` table as the ones teachers and pupils
 * add themselves, told apart by `source`, so `progress.book`, the book-readers
 * query and every existing foreign key keep working unchanged.
 *
 * `diploma_continents` holds which group of a grade's list sits on which of the
 * eight continents. A (continent, grade) pair with no row there offers the
 * whole grade's list instead. It is a table rather than a column on `books`
 * because the library still has to confirm the mapping, and changing it should
 * touch ~40 rows rather than every book.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.alterTable('books', function (table) {
        table.string('source', 16).notNullable().defaultTo('custom')
        table.string('grade_band', 8).nullable()
        table.string('category', 120).nullable()
        table.string('external_key', 24).nullable()
        table.jsonb('alt_titles').nullable()
        table.string('series_note', 255).nullable()
        // The row names a series, or several books, so the pupil has to say
        // which book they actually read.
        table.boolean('needs_title_input').notNullable().defaultTo(false)
    })

    await knex.raw(`ALTER TABLE books ADD CONSTRAINT books_source_check
        CHECK (source IN ('diploma', 'custom'))`)
    await knex.raw(`ALTER TABLE books ADD CONSTRAINT books_grade_band_check
        CHECK (grade_band IS NULL OR grade_band IN ('1-2', '3-4', '5-6', '7', '8', '9'))`)
    // A diploma book is not owned by anyone and must carry its source key.
    await knex.raw(`ALTER TABLE books ADD CONSTRAINT books_source_shape_check
        CHECK (
            (source = 'custom'  AND added_by IS NOT NULL AND external_key IS NULL)
            OR
            (source = 'diploma' AND added_by IS NULL     AND external_key IS NOT NULL
                                AND grade_band IS NOT NULL AND category IS NOT NULL)
        )`)

    // Diploma books have no owner, so added_by has to accept NULL. The foreign
    // key and its ON DELETE CASCADE are unaffected.
    await knex.raw('ALTER TABLE books ALTER COLUMN added_by DROP NOT NULL')

    await knex.raw(`CREATE UNIQUE INDEX books_external_key_unique
        ON books (external_key) WHERE source = 'diploma'`)
    await knex.raw('CREATE INDEX books_grade_band_category_idx ON books (grade_band, category)')

    await knex.schema.createTable('diploma_continents', function (table) {
        table.increments('id').primary()
        // Matches a key in frontend/src/game/scenes/continentRegistry.js.
        table.string('map_key', 32).notNullable()
        table.string('grade_band', 8).notNullable()
        table.string('category', 120).notNullable()
        table.unique(['grade_band', 'category'])
        table.index(['map_key', 'grade_band'])
    })
    await knex.raw(`ALTER TABLE diploma_continents ADD CONSTRAINT diploma_continents_grade_band_check
        CHECK (grade_band IN ('1-2', '3-4', '5-6', '7', '8', '9'))`)

    // `users.grade` already exists (integer, default 1) and teachers can already
    // edit it. It is what decides which list a pupil sees, so pin it to the
    // grades the diploma covers. Clamp first, so an odd existing row cannot
    // make the migration fail.
    await knex.raw('UPDATE users SET grade = LEAST(GREATEST(grade, 1), 9)')
    await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_grade_check
        CHECK (grade BETWEEN 1 AND 9)`)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_grade_check')
    await knex.schema.dropTableIfExists('diploma_continents')

    // Owner-less rows cannot survive added_by going back to NOT NULL.
    await knex('books').where({ source: 'diploma' }).del()

    await knex.raw('DROP INDEX IF EXISTS books_grade_band_category_idx')
    await knex.raw('DROP INDEX IF EXISTS books_external_key_unique')
    await knex.raw('ALTER TABLE books DROP CONSTRAINT IF EXISTS books_source_shape_check')
    await knex.raw('ALTER TABLE books DROP CONSTRAINT IF EXISTS books_grade_band_check')
    await knex.raw('ALTER TABLE books DROP CONSTRAINT IF EXISTS books_source_check')
    await knex.raw('ALTER TABLE books ALTER COLUMN added_by SET NOT NULL')

    return knex.schema.alterTable('books', function (table) {
        table.dropColumn('needs_title_input')
        table.dropColumn('series_note')
        table.dropColumn('alt_titles')
        table.dropColumn('external_key')
        table.dropColumn('category')
        table.dropColumn('grade_band')
        table.dropColumn('source')
    })
}
