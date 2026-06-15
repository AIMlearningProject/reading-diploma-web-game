/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Remove the old check constraint and add a new one
    await knex.schema.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check;
        ALTER TABLE users ADD CONSTRAINT role_check CHECK (role IN ('student', 'teacher'));
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.raw(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check;
        ALTER TABLE users ADD CONSTRAINT role_check CHECK (role IN ('student', 'teacher', 'principal'));
    `)
}