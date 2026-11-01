// The four puzzle scenes. Each sits on a continent whose geographic twin gives
// the item it needs, so the pairing survives free exploration order.
// See docs/puzzle-scenes-design.md.
//
// All pupil-facing copy is Finnish and awaits a native-speaker review. The
// panel shows no title, so `title` only names the dialog for screen readers.
// `hints` carries one short line for every item that is not the answer.

const puzzleScenes = [
    {
        id: 'south-america-river-crossing',
        mapKey: 'SouthAmericaMap',
        title: 'Joki nousi',
        story: 'Sade nosti joen, ja lossin mela katosi virtaan. Lapset eivät pääse kouluun.',
        question: 'Mikä saisi lossin liikkeelle?',
        correctItem: 'mela',
        hints: {
            kaukoputki: 'Kaukoputki ei auta lossia. Kokeile jotain muuta!',
            siemenpussi: 'Siemenpussi ei auta lossia. Kokeile jotain muuta!',
            korallihuilu: 'Korallihuilu ei auta lossia. Kokeile jotain muuta!'
        },
        solved: {
            praise: 'Onnistui!',
            resolution: 'Lossi lähti liikkeelle, ja lapset pääsivät joen yli.'
        },
        reward: { gameId: 'koskimelonta' }
    },
    {
        id: 'africa-bare-slope',
        mapKey: 'AfricaMap',
        title: 'Paljas rinne',
        story: 'Pikku apinan rinteellä kaikki hedelmäpuut ovat kuivuneet.',
        question: 'Mikä saisi rinteen taas vihreäksi?',
        correctItem: 'siemenpussi',
        hints: {
            kaukoputki: 'Kaukoputki ei auta apinaa. Kokeile jotain muuta!',
            korallihuilu: 'Korallihuilu ei auta apinaa. Kokeile jotain muuta!',
            mela: 'Mela ei auta apinaa. Kokeile jotain muuta!'
        },
        solved: {
            praise: 'Onnistui!',
            resolution: 'Siemenet itivät, ja rinteelle kasvoi uusi metsä.'
        },
        reward: { gameId: 'siemensade' }
    },
    {
        id: 'oceania-reef-maze',
        mapKey: 'OceaniaMap',
        title: 'Arka pikkukala',
        story: 'Pieni kala haluaisi uida ylös valoon, mutta se ei uskalla.',
        question: 'Mikä antaisi sille rohkeutta?',
        correctItem: 'korallihuilu',
        hints: {
            kaukoputki: 'Kaukoputki ei auta kalaa. Kokeile jotain muuta!',
            siemenpussi: 'Siemenpussi ei auta kalaa. Kokeile jotain muuta!',
            mela: 'Mela ei auta kalaa. Kokeile jotain muuta!'
        },
        solved: {
            praise: 'Onnistui!',
            resolution: 'Kala uskalsi uida ylös ja tanssi huilun tahdissa.'
        },
        reward: { gameId: 'delfiinin-reitti' }
    },
    {
        id: 'antarctica-lost-camp',
        mapKey: 'AntarcticaMap',
        title: 'Kadonnut leiri',
        story: 'Lumipyryn jälkeen kaikki on valkoista. Retkikunta ei löydä leiriään.',
        question: 'Mikä auttaisi löytämään leirin?',
        correctItem: 'kaukoputki',
        hints: {
            siemenpussi: 'Siemenpussi ei auta retkikuntaa. Kokeile jotain muuta!',
            korallihuilu: 'Korallihuilu ei auta retkikuntaa. Kokeile jotain muuta!',
            mela: 'Mela ei auta retkikuntaa. Kokeile jotain muuta!'
        },
        solved: {
            praise: 'Onnistui!',
            resolution: 'Kaukoputkella näkyi punainen lippu, ja retkikunta löysi leirinsä.'
        },
        reward: { gameId: 'jaaretki' }
    }
]

const sceneByMap = Object.fromEntries(puzzleScenes.map((scene) => [scene.mapKey, scene]))

/** The scene held by this continent, or null if the continent gives an item. */
const sceneForMap = (mapKey) => sceneByMap[mapKey] ?? null

export { puzzleScenes, sceneForMap }
export default puzzleScenes
