/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.createTable('teacher_invites', function (table) {
        table.increments('id').primary()
        table.integer('teacher_id').unsigned().notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.text('invite_secret').notNullable()
        table.boolean('active').notNullable().defaultTo(true)
        table.timestamp('expires_at').nullable()
        // Automatically adds 'created_at' and 'updated_at' columns (with timezone)
        table.timestamps(true, true)
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.dropTableIfExists('teacher_invites')
}