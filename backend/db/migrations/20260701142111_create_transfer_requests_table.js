/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    return await knex.schema.createTable('transfer_requests', function (table) {
        table.increments('id').primary()
        table.integer('requester_teacher_id').unsigned().notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.integer('recipient_teacher_id').unsigned().notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.string('status').notNullable().defaultTo('pending')
        table.text('message').nullable()
        // Automatically adds 'created_at' and 'updated_at' columns (with timezone)
        table.timestamps(true, true)

        table.check('status IN (\'pending\', \'accepted\', \'rejected\', \'cancelled\')')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    return knex.schema.dropTableIfExists('transfer_requests')
}