/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    return knex.schema
        .alterTable('books', (table) => {
            table.dropUnique('title')
            table.unique(['title', 'author'])
        })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    return knex.schema
        .alterTable('books', (table) => {
            table.dropUnique(['title', 'author'])
            table.unique('title')
        })
}
