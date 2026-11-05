// The four tools the pupil collects, one on each of four continents, and uses
// on that continent's geographic twin. See docs/puzzle-scenes-design.md.
//
// There is no fixed exploration order, so nothing here may assume one: an item
// is simply owned or not owned.
//
// Finnish copy is pupil-facing and must not be translated. `icon` holds the
// item's ink icon by the size it was baked at, for <InkIcon>: 28 in the backpack,
// 30 on a scene's tile, 96 on the item-found card.

import kaukoputki28 from '../../assets/icons/item_kaukoputki_28.png'
import kaukoputki30 from '../../assets/icons/item_kaukoputki_30.png'
import kaukoputki96 from '../../assets/icons/item_kaukoputki_96.png'
import siemenpussi28 from '../../assets/icons/item_siemenpussi_28.png'
import siemenpussi30 from '../../assets/icons/item_siemenpussi_30.png'
import siemenpussi96 from '../../assets/icons/item_siemenpussi_96.png'
import korallihuilu28 from '../../assets/icons/item_korallihuilu_28.png'
import korallihuilu30 from '../../assets/icons/item_korallihuilu_30.png'
import korallihuilu96 from '../../assets/icons/item_korallihuilu_96.png'
import mela28 from '../../assets/icons/item_mela_28.png'
import mela30 from '../../assets/icons/item_mela_30.png'
import mela96 from '../../assets/icons/item_mela_96.png'

const items = [
    {
        id: 'kaukoputki',
        name: 'Kaukoputki',
        power: 'see far',
        homeMapKey: 'ArcticMap',
        desc: 'Messinkiputki, jolla erotat pienenkin asian kaukaa.',
        found: 'Löysitte hylätyltä tutkimusasemalta vanhan kaukoputken. Sillä näkee pienenkin asian kaukaa.',
        icon: { 28: kaukoputki28, 30: kaukoputki30, 96: kaukoputki96 }
    },
    {
        id: 'siemenpussi',
        name: 'Siemenpussi',
        power: 'make things grow',
        homeMapKey: 'EuropeMap',
        desc: 'Pussillinen siemeniä. Ne itävät nopeasti ja kasvavat isoiksi puiksi.',
        found: 'Vuoristokylän puutarhuri antoi teille pussillisen siemeniä. Ne kasvavat nopeasti isoiksi puiksi.',
        icon: { 28: siemenpussi28, 30: siemenpussi30, 96: siemenpussi96 }
    },
    {
        id: 'korallihuilu',
        name: 'Korallihuilu',
        power: 'play an encouraging song',
        homeMapKey: 'AsiaMap',
        desc: 'Korallista tehty huilu. Sen sävel antaa kuulijalle rohkeutta.',
        found: 'Löysitte rannalta huilun, joka näyttää korallista tehdyltä. Kun kokeilitte puhaltaa, se soi kauniisti.',
        icon: { 28: korallihuilu28, 30: korallihuilu30, 96: korallihuilu96 }
    },
    {
        id: 'mela',
        name: 'Mela',
        power: 'move a boat',
        homeMapKey: 'NorthAmericaMap',
        desc: 'Kevyt puumela. Sillä vene kulkee minne haluat.',
        found: 'Löysitte joen rannalta kevyen melan. Sillä vene kulkee minne haluatte.',
        icon: { 28: mela28, 30: mela30, 96: mela96 }
    }
]

const itemById = Object.fromEntries(items.map((item) => [item.id, item]))

/** The item found on this continent, or null if the continent holds a scene. */
const itemForMap = (mapKey) => items.find((item) => item.homeMapKey === mapKey) ?? null

export { items, itemById, itemForMap }
export default items
