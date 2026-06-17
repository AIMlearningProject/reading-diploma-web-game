/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    return knex.schema.alterTable('books', function (table) {
        table.string('booktype', 255).notNullable().defaultTo('physical').alter()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    return knex.schema.alterTable('books', function (table) {
        table.string('booktype', 255).notNullable().alter()
    })
}