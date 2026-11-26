/**
 * Deletes the rewards of the continent tile puzzles. Finishing a continent used
 * to grant one (reward_type 'minigame', name = the continent's mapKey); the
 * puzzles have been removed from the game, and nothing reads these rows any more.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex('rewards').where({ reward_type: 'minigame' }).del()
}

/**
 * The deleted rows are not restored: no code reads them.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async () => {}
