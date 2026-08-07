/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Replaces the content column with a page_count column
    await knex.schema.alterTable('rewards', (table) => {
        table.renameColumn('reward', 'name')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.alterTable('rewards', (table) => {
        table.renameColumn('name', 'reward')
    })
}