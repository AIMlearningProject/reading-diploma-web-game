/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Remove extra check constraint (users_role_check), created with the database
    await knex.schema.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.raw(`
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'principal'));
    `)
}