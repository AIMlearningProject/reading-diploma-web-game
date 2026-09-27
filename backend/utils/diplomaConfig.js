/**
 * How the reading diploma is laid out inside the game.
 *
 * Each of the eight continents stands for one genre and holds a short route of
 * nodes; a node is one book, picked by the pupil from that continent's list.
 * Finishing every node completes the continent.
 *
 * PENDING the library's answer to sheet 03 of the questionnaire: at four nodes a
 * pupil reads 8 x 4 = 32 books, while the paper diploma asks for 5-9. The number
 * is here, alone, so that answer is a one-line change. The smallest book pool of
 * any (grade, continent) pair is 6 (grade 1-2, Oceania), which is the ceiling on
 * how far this can go without a pupil running out of books to pick.
 */

const NODES_PER_CONTINENT = 4

// Levels 1-8, one per continent. Mirrors ReadingState.mapOrder on the frontend,
// where level N is mapOrder[N - 1].
const LEVEL_COUNT = 8

/**
 * The continent's overall percentage, from its nodes. A node is one book, so
 * four half-read books and two finished ones come to the same place.
 */
const continentProgress = (nodeProgresses) => {
    if (!nodeProgresses || nodeProgresses.length === 0) return 0
    const total = nodeProgresses.reduce((sum, pct) => sum + (Number(pct) || 0), 0)
    return Math.round(total / nodeProgresses.length)
}

export { NODES_PER_CONTINENT, LEVEL_COUNT, continentProgress }
