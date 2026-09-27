/**
 * The Kirja kantaa reading diploma publishes one book list per grade band, not
 * per grade: years 1 and 2 share a list, so do 3 and 4, and 5 and 6, while 7, 8
 * and 9 each have their own.
 *
 * `users.grade` holds the pupil's school year (1-9) and is the only thing that
 * decides which list they see, so the band is derived rather than stored.
 */

const GRADE_BANDS = ['1-2', '3-4', '5-6', '7', '8', '9']

const BY_GRADE = {
    1: '1-2', 2: '1-2',
    3: '3-4', 4: '3-4',
    5: '5-6', 6: '5-6',
    7: '7', 8: '8', 9: '9'
}

/**
 * The band for a school year, or null if the year is outside 1-9.
 * Teachers have a grade too (it defaults to 1) but no diploma of their own.
 */
const gradeBandFor = (grade) => BY_GRADE[Number(grade)] ?? null

export { GRADE_BANDS, gradeBandFor }
export default gradeBandFor
