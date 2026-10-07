// The four puzzle scenes. Each sits on a continent whose geographic twin gives
// the item it needs, so the pairing survives free exploration order.
// See docs/puzzle-scenes-design.md.
//
// All pupil-facing copy is Finnish and awaits a native-speaker review.
// `hints` carries one line for every item that is not the answer: it says why
// that tool does not fit and points at the missing power, without naming the
// answer.

const puzzleScenes = [
    {
        id: 'south-america-river-crossing',
        mapKey: 'SouthAmericaMap',
        continentKicker: 'ETELÄ-AMERIKAN MATKA',
        sceneIndex: 1,
        sceneCount: 1,
        title: 'Joki nousi',
        story: 'Yön sade nosti joen, ja lossin mela huuhtoutui virran mukana. Toisella rannalla lapset odottavat pääsyä kouluun.',
        question: 'Mitä lossista puuttuu, jotta se liikkuisi?',
        correctItem: 'mela',
        hints: {
            kaukoputki: 'Näet toisen rannan tarkasti, mutta katse ei liikuta lossia. Mikä työntäisi sen vettä vasten?',
            siemenpussi: 'Siemenet itävät maassa, eivät virrassa. Mikä saisi lossin kulkemaan?',
            simpukkapilli: 'Pillin ääni kantaa kauas, mutta lossi ei liiku äänestä. Mikä työntäisi sen liikkeelle?'
        },
        solved: {
            praise: 'Hienoa, löysit oikean esineen!',
            resolution: 'Lossi lähti liikkeelle, ja lapset pääsivät joen yli.'
        },
        reward: { gameId: 'koskimelonta' }
    },
    {
        id: 'africa-bare-slope',
        mapKey: 'AfricaMap',
        continentKicker: 'AFRIKAN SEIKKAILU',
        sceneIndex: 1,
        sceneCount: 1,
        title: 'Paljas rinne',
        story: 'Tulva vei rinteeltä kaikki puut. Multa valuu jokeen, eivätkä apinat löydä enää hedelmiä.',
        question: 'Mikä esine saisi rinteen vihertämään uudelleen?',
        correctItem: 'siemenpussi',
        hints: {
            kaukoputki: 'Kaukoputkella näkee kauas, mutta rinne pysyy paljaana. Mikä saisi jotain kasvamaan?',
            simpukkapilli: 'Kukaan ei tule pillin ääneen istuttamaan puita. Mikä itäisi itsestään?',
            mela: 'Melalla kuljetaan vettä pitkin, mutta rinne on kuiva. Mikä saisi jotain kasvamaan?'
        },
        solved: {
            praise: 'Juuri noin, se oli oikea esine!',
            resolution: 'Siemenet itivät, ja rinteelle nousi uusi metsä.'
        },
        reward: { gameId: 'siemensade' }
    },
    {
        id: 'oceania-reef-maze',
        mapKey: 'OceaniaMap',
        continentKicker: 'OSEANIAN MATKA',
        sceneIndex: 1,
        sceneCount: 1,
        title: 'Riutan sokkelo',
        story: 'Pieni kilpikonna on jäänyt koralliriutan sisään. Käytävät haarautuvat joka suuntaan, eikä avomeri näy mistään.',
        question: 'Millä esineellä kutsuisit avuksi jonkun, joka tuntee reitin?',
        correctItem: 'simpukkapilli',
        hints: {
            kaukoputki: 'Veden alla kaukoputki ei näytä tietä. Miten kutsuisit jonkun avuksi?',
            siemenpussi: 'Siemenet eivät kasva suolaisessa vedessä. Miten kutsuisit jonkun avuksi?',
            mela: 'Melalla pääsee riutan yli, mutta kilpikonna on sen sisällä. Miten kutsuisit jonkun avuksi?'
        },
        solved: {
            praise: 'Hienoa, se kuului kauas!',
            resolution: 'Delfiini tuli pillin ääneen ja ui kilpikonnan edellä avomerelle.'
        },
        reward: { gameId: 'delfiinin-reitti' }
    },
    {
        id: 'antarctica-lost-camp',
        mapKey: 'AntarcticaMap',
        continentKicker: 'ETELÄMANNER: SUURI JÄÄRETKI',
        sceneIndex: 1,
        sceneCount: 1,
        title: 'Kadonnut leiri',
        story: 'Lumipyry loppui, ja kaikki näyttää valkoiselta. Retkikunnan leiri on jossain, mutta kukaan ei erota sitä.',
        question: 'Mikä esine auttaisi löytämään leirin punaisen lipun?',
        correctItem: 'kaukoputki',
        hints: {
            siemenpussi: 'Jäällä ei kasva mikään. Mikä toisi kaukaisen lähelle?',
            simpukkapilli: 'Ääni katoaa tuuleen, eikä leiri kuule. Mikä toisi kaukaisen lähelle?',
            mela: 'Melalle ei ole jäällä käyttöä. Mikä toisi kaukaisen lähelle?'
        },
        solved: {
            praise: 'Hienoa, löysit sen!',
            resolution: 'Kaukoputkesta erottui punainen lippu, ja retkikunta kääntyi sitä kohti.'
        },
        reward: { gameId: 'jaaretki' }
    }
]

const sceneByMap = Object.fromEntries(puzzleScenes.map((scene) => [scene.mapKey, scene]))

/** The scene held by this continent, or null if the continent gives an item. */
const sceneForMap = (mapKey) => sceneByMap[mapKey] ?? null

export { puzzleScenes, sceneForMap }
export default puzzleScenes
