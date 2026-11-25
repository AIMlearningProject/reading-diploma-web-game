// The camp's day, read from the pupil's own clock.
//
// day      the buddy strolls, sits by the sea and reads
// evening  the fire is lit; the buddy sits or reads beside it, no strolling
// bed      the buddy sleeps in the tent and the scene says good night
//
// Time comes from `Date`, never from a timer, so a page whose clock is set from
// outside (the demo video sets it with Playwright's page.clock) shows that hour.

export const EVENING_FROM = 19
export const BED_FROM = 21
export const MORNING_FROM = 7

export function phaseAt(date) {
    const hour = date.getHours()
    if (hour >= BED_FROM || hour < MORNING_FROM) return 'bed'
    if (hour >= EVENING_FROM) return 'evening'
    return 'day'
}
