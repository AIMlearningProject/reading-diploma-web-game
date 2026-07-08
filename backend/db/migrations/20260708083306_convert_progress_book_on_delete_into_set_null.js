/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Prevents a progress entry from being deleted when the book read on that level is deleted

    // 1. Drops the existing FK constraint
    await knex.schema.alterTable('progress', (table) => {
        table.dropForeign('book')
    })

    // 2. Ensures the column is nullable (required for SET NULL)
    await knex.schema.alterTable('progress', (table) => {
        table.integer('book').nullable().alter()
    })

    // 3. Re-adds FK with ON DELETE SET NULL
    await knex.schema.alterTable('progress', (table) => {
        table
            .foreign('book')
            .references('id')
            .inTable('books')
            .onDelete('SET NULL')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    // Reverse: drops SET NULL FK and restores CASCADE
    await knex.schema.alterTable('progress', (table) => {
        table.dropForeign('book')
    })

    await knex.schema.alterTable('progress', (table) => {
        table
            .foreign('book')
            .references('id')
            .inTable('books')
            .onDelete('CASCADE')
    })
}