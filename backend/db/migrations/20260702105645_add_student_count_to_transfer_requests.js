/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    return knex.schema.alterTable('transfer_requests', function (table) {
        table.integer('student_count').notNullable().defaultTo(0)
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    return knex.schema.alterTable('transfer_requests', function (table) {
        table.dropColumn('student_count')
    })
}