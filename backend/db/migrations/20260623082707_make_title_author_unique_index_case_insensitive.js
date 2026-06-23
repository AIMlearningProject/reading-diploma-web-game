/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.alterTable('books', (table) => {
        table.dropUnique(['title', 'author'])
    })

    await knex.raw(`
        CREATE UNIQUE INDEX books_title_author_ci_unique
        ON books (LOWER(title), LOWER(author));
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.raw(`
        DROP INDEX IF EXISTS books_title_author_ci_unique;
    `)

    await knex.schema.alterTable('books', (table) => {
        table.unique(['title', 'author'])
    })
}