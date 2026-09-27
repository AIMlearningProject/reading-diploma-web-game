/**
 * A continent is no longer one book but a short route of nodes, each holding one
 * book the pupil picks from that continent's genre. Finishing every node on a
 * continent is what completes it.
 *
 * `level_nodes` is a child of `progress`: one row per (level, node). `progress`
 * keeps its per-continent job -- level_status, the submission it is joined to,
 * and `current_progress`, which now means how far through the whole continent
 * the pupil is rather than how far through one book. That keeps the token
 * animation, the quiz trigger and the teacher's view working unchanged.
 *
 * `progress.book` / `progress.book_title` are kept in step with the node the
 * pupil touched last, so `book-readers` and the teacher's level list still show
 * something sensible without being rewritten.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.createTable('level_nodes', function (table) {
        table.increments('id').primary()
        table.integer('progress_id').unsigned().notNullable()
            .references('id').inTable('progress').onDelete('CASCADE')
        table.integer('node_index').notNullable()
        table.integer('book').unsigned().nullable()
            .references('id').inTable('books').onDelete('SET NULL')
        // What the pupil says they actually read: a catalogue row often offers a
        // choice rather than naming one book.
        table.string('book_title', 200).nullable()
        table.integer('current_progress').notNullable().defaultTo(0)
        table.unique(['progress_id', 'node_index'])
    })
    await knex.raw(`ALTER TABLE level_nodes ADD CONSTRAINT level_nodes_progress_check
        CHECK (current_progress BETWEEN 0 AND 100)`)
    await knex.raw(`ALTER TABLE level_nodes ADD CONSTRAINT level_nodes_index_check
        CHECK (node_index BETWEEN 1 AND 12)`)

    // Backfill: every existing level gets its nodes. A level that already had a
    // book keeps it, on the first node, with the progress it had.
    const NODE_COUNT = 4
    const levels = await knex('progress').select('id', 'book', 'book_title', 'current_progress')
    if (levels.length > 0) {
        const rows = []
        for (const level of levels) {
            for (let index = 1; index <= NODE_COUNT; index++) {
                rows.push({
                    progress_id: level.id,
                    node_index: index,
                    book: index === 1 ? level.book : null,
                    book_title: index === 1 ? level.book_title : null,
                    current_progress: index === 1 ? (level.current_progress ?? 0) : 0
                })
            }
        }
        await knex.batchInsert('level_nodes', rows, 500)

        // current_progress meant "through this one book" and now means "through
        // this continent", so what was 100% of one book is 1 node out of four.
        await knex.raw(`
            UPDATE progress p
               SET current_progress = sub.pct
              FROM (
                    SELECT progress_id, ROUND(AVG(current_progress))::int AS pct
                      FROM level_nodes
                     GROUP BY progress_id
                   ) sub
             WHERE p.id = sub.progress_id
        `)
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    // Put current_progress back to meaning "through the book on this level".
    await knex.raw(`
        UPDATE progress p
           SET current_progress = COALESCE(sub.pct, 0)
          FROM (
                SELECT progress_id, current_progress AS pct
                  FROM level_nodes
                 WHERE node_index = 1
               ) sub
         WHERE p.id = sub.progress_id
    `)
    return knex.schema.dropTableIfExists('level_nodes')
}
