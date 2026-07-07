/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // 1. Find a qualified teacher user
    let user = await knex('users')
        .select('id')
        .where('role', 'teacher')
        .whereNotNull('email')
        .whereNotNull('name')
        .whereNotNull('avatar')
        .whereNull('password_hash')
        .first()

    // 2. Check if any users exist
    if (!user) user = await knex('users').select('id').orderBy('id').first()

    // 3. If no users exist, create one
    if (!user) {
        const [newUser] = await knex('users')
            .insert({
                email: 'knex@migration.com',
                name: 'add_added_by_field',
                password_hash: null,
                avatar: null,
                currently_reading: null,
                grade: 1,
                role: 'teacher',
                teacher_id: null
            })
            .returning(['id'])

        user = newUser
    }

    // 4. Add the column as nullable first (critical!)
    await knex.schema.alterTable('books', (table) => {
        table.integer('added_by').unsigned().nullable()
    })

    // 5. Populate existing rows
    await knex('books').update({ added_by: user.id })

    // 6. Now make it NOT NULL
    await knex.schema.alterTable('books', (table) => {
        table.integer('added_by').unsigned().notNullable().alter()
    })

    // 7. Add the foreign key constraint
    await knex.schema.alterTable('books', (table) => {
        table
            .foreign('added_by')
            .references('users.id')
            .onDelete('CASCADE')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.alterTable('books', (table) => {
        table.dropForeign(['added_by'])
        table.dropColumn('added_by')
    })
}