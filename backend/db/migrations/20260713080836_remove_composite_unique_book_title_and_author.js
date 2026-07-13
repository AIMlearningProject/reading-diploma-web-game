/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.raw(`
        DROP INDEX IF EXISTS books_title_author_ci_unique;
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.raw(`
        CREATE UNIQUE INDEX books_title_author_ci_unique
        ON books (LOWER(title), LOWER(author));
    `)
}