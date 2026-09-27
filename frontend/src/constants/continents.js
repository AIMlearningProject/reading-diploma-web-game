/**
 * The eight continents, in level order: level N is CONTINENTS[N - 1].
 *
 * The same order as ReadingState.mapOrder and the seed's MAP_ORDER, because the
 * level numbers in the progress table are derived from it. The Finnish names are
 * UI text -- do not translate them.
 */
const CONTINENTS = [
    { level: 1, mapKey: 'ArcticMap', name: 'Pohjoisnapa' },
    { level: 2, mapKey: 'EuropeMap', name: 'Eurooppa' },
    { level: 3, mapKey: 'AsiaMap', name: 'Aasia' },
    { level: 4, mapKey: 'NorthAmericaMap', name: 'Pohjois-Amerikka' },
    { level: 5, mapKey: 'SouthAmericaMap', name: 'Etelä-Amerikka' },
    { level: 6, mapKey: 'AfricaMap', name: 'Afrikka' },
    { level: 7, mapKey: 'OceaniaMap', name: 'Oseania' },
    { level: 8, mapKey: 'AntarcticaMap', name: 'Etelämanner' },
]

const CONTINENT_BY_MAP_KEY = Object.fromEntries(
    CONTINENTS.map((continent) => [continent.mapKey, continent])
)

/**
 * The diploma publishes one book list per grade band, not per grade.
 * Mirrors backend/utils/gradeBand.js.
 */
const GRADE_BANDS = ['1-2', '3-4', '5-6', '7', '8', '9']

const gradeBandFor = (grade) => {
    const n = Number(grade)
    if (!Number.isSafeInteger(n) || n < 1 || n > 9) return null
    if (n <= 2) return '1-2'
    if (n <= 4) return '3-4'
    if (n <= 6) return '5-6'
    return String(n)
}

// Shown for a continent that has no group of its own in a given grade: the
// pupil may pick any book from their year's list there.
const FREE_CHOICE_LABEL = 'Vapaa valinta'

export { CONTINENTS, CONTINENT_BY_MAP_KEY, GRADE_BANDS, gradeBandFor, FREE_CHOICE_LABEL }
export default CONTINENTS
