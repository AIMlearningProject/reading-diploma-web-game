/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Remove the old check constraint and add a new one
    await knex.schema.raw(`
        ALTER TABLE progress DROP CONSTRAINT IF EXISTS progress_level_status_check;
        ALTER TABLE progress ADD CONSTRAINT progress_level_status_check CHECK (level_status IN ('incomplete', 'complete', 'reviewed', 'resubmit'));
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.raw(`
        ALTER TABLE progress DROP CONSTRAINT IF EXISTS progress_level_status_check;
        ALTER TABLE progress ADD CONSTRAINT progress_level_status_check CHECK (level_status IN ('incomplete', 'complete', 'reviewed'));
    `)
}