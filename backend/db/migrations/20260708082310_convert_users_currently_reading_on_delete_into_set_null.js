/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Prevents a user from being deleted when the book, that they are reading is deleted

    // 1. Drops the existing FK constraint in users table
    await knex.schema.alterTable('users', (table) => {
        table.dropForeign('currently_reading')
    })

    // 2. Ensures the column is nullable (required for SET NULL)
    await knex.schema.alterTable('users', (table) => {
        table.integer('currently_reading').nullable().alter()
    })

    // 3. Re-adds FK with ON DELETE SET NULL
    await knex.schema.alterTable('users', (table) => {
        table
            .foreign('currently_reading')
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
    await knex.schema.alterTable('users', (table) => {
        table.dropForeign('currently_reading')
    })

    await knex.schema.alterTable('users', (table) => {
        table
            .foreign('currently_reading')
            .references('id')
            .inTable('books')
            .onDelete('CASCADE')
    })
}