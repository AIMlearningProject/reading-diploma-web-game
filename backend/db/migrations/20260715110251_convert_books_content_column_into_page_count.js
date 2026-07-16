/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Replaces the content column with a page_count column
    await knex.schema.alterTable('books', (table) => {
        table.integer('page_count').nullable()
    })

    await knex.schema.alterTable('books', (table) => {
        table.dropColumn('content')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.alterTable('books', (table) => {
        table.string('content').nullable()
    })

    await knex.schema.alterTable('books', (table) => {
        table.dropColumn('page_count')
    })
}