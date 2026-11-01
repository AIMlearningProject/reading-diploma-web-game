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
        found: 'Löysitte hylätyltä tutkimusasemalta vanhan kaukoputken. Sillä näkee pienenkin asian kaukaa.',
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
        desc: 'Pussillinen siemeniä. Ne itävät nopeasti ja kasvavat isoiksi puiksi.',
        found: 'Vuoristokylän puutarhuri antoi teille pussillisen siemeniä. Ne kasvavat nopeasti isoiksi puiksi.',
        icon: [
            'M6.5 9.5h11l1.2 8.5a2.2 2.2 0 0 1-2.2 2.5H7.5a2.2 2.2 0 0 1-2.2-2.5z',
            'M9 9.5V7.5a3 3 0 0 1 6 0v2',
            'M10.5 14.5h.01',
            'M13.5 16.5h.01'
        ]
    },
    {
        id: 'korallihuilu',
        name: 'Korallihuilu',
        power: 'play an encouraging song',
        homeMapKey: 'AsiaMap',
        desc: 'Korallista tehty huilu. Sen sävel antaa kuulijalle rohkeutta.',
        found: 'Löysitte rannalta huilun, joka näyttää korallista tehdyltä. Kun kokeilitte puhaltaa, se soi kauniisti.',
        icon: [
            'M3.5 17.5 17.5 3.5l3 3-14 14z',
            'M6 15l3 3',
            'M11 13h.01',
            'M13.5 10.5h.01',
            'M16 8h.01'
        ]
    },
    {
        id: 'mela',
        name: 'Mela',
        power: 'move a boat',
        homeMapKey: 'NorthAmericaMap',
        desc: 'Kevyt puumela. Sillä vene kulkee minne haluat.',
        found: 'Löysitte joen rannalta kevyen melan. Sillä vene kulkee minne haluatte.',
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
