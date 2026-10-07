// The four tools the pupil collects, one on each of four continents, and uses
// on that continent's geographic twin. See docs/puzzle-scenes-design.md.
//
// There is no fixed exploration order, so nothing here may assume one: an item
// is simply owned or not owned.
//
// Finnish copy is pupil-facing and must not be translated. `icon` is a
// placeholder line drawing on a 24 viewBox, stroke only, replaced by the real
// art later.

const items = [
    {
        id: 'kaukoputki',
        name: 'Kaukoputki',
        power: 'see far',
        homeMapKey: 'ArcticMap',
        desc: 'Messinkiputki, jolla erotat pienenkin asian kaukaa.',
        found: 'Löysit messinkisen kaukoputken hylätyn tutkimusaseman ikkunalaudalta.',
        icon: [
            'M4.5 16.5 15 6l3 3L7.5 19.5z',
            'M2.5 21.5 5.5 18.5',
            'M16 5.5 18.5 3',
            'M12.5 12.5 14.5 14.5'
        ]
    },
    {
        id: 'siemenpussi',
        name: 'Siemenpussi',
        power: 'make things grow',
        homeMapKey: 'EuropeMap',
        desc: 'Pussillinen siemeniä. Ne itävät nopeasti ja juuret pitävät maan paikallaan.',
        found: 'Sait vuoristokylän puutarhurilta pussillisen siemeniä.',
        icon: [
            'M6.5 9.5h11l1.2 8.5a2.2 2.2 0 0 1-2.2 2.5H7.5a2.2 2.2 0 0 1-2.2-2.5z',
            'M9 9.5V7.5a3 3 0 0 1 6 0v2',
            'M10.5 14.5h.01',
            'M13.5 16.5h.01'
        ]
    },
    {
        id: 'simpukkapilli',
        name: 'Simpukkapilli',
        power: 'call under water',
        homeMapKey: 'AsiaMap',
        desc: 'Kun puhallat, ääni kantaa kauas veden alle.',
        found: 'Helmensukeltaja antoi sinulle simpukasta veistetyn pillin.',
        icon: [
            'M3.5 18.5a8.5 8.5 0 0 1 17 0z',
            'M12 18.5V4.5',
            'M8 18.5 9.5 6',
            'M16 18.5 14.5 6'
        ]
    },
    {
        id: 'mela',
        name: 'Mela',
        power: 'move a boat',
        homeMapKey: 'NorthAmericaMap',
        desc: 'Kevyt puumela. Sillä vene kulkee minne haluat.',
        found: 'Jokirannan verstaalta löysit kevyen puumelan.',
        icon: [
            'M12 3c2.4 0 4.2 2.4 4.2 5.4S14.4 14 12 14s-4.2-2.6-4.2-5.6S9.6 3 12 3z',
            'M12 14v6.5',
            'M10 20.5h4'
        ]
    }
]

const itemById = Object.fromEntries(items.map((item) => [item.id, item]))

/** The item found on this continent, or null if the continent holds a scene. */
const itemForMap = (mapKey) => items.find((item) => item.homeMapKey === mapKey) ?? null

export { items, itemById, itemForMap }
export default items
