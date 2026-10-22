// The four mini-games a solved scene grants. They are played on the student
// dashboard, never inside the map.
//
// One rule they all obey: a single endless run at constant difficulty, no
// rounds, no waves, no escalation. The only number that grows is the pupil's
// own. See docs/puzzle-scenes-design.md section 4.
//
// `module` is filled in as each game is built; a game whose module is still
// null shows as "tulossa" on the dashboard rather than opening. A module is
// plain JS — { create, update, draw } — driven by <MiniGameCanvas>.

import dolphinRoute from '../minigames/dolphinRoute.js'
import iceExpedition from '../minigames/iceExpedition.js'
import rapids from '../minigames/rapids.js'
import seedRain from '../minigames/seedRain.js'

const miniGames = {
    'koskimelonta': {
        id: 'koskimelonta',
        name: 'KOSKIMELONTA',
        pitch: 'Meloo kosken läpi ja väistä kiviä. Pelaa sitä oppilaan sivulla!',
        unit: 'metriä',
        module: rapids,
        icon: [
            'M3 13.5c3.5 0 3.5 2 7 2s3.5-2 7-2 3.5 2 4 2',
            'M4.5 9.5h15l-2.5 4.2a3 3 0 0 1-2.6 1.5H9.6A3 3 0 0 1 7 13.7z',
            'M9 9.5 10.5 4.5',
            'M15 9.5 13.5 4.5'
        ]
    },
    'siemensade': {
        id: 'siemensade',
        name: 'HEDELMÄSADE',
        pitch: 'Nappaa puusta putoavat hedelmät koriin ennen kuin ne osuvat maahan. Pelaa sitä oppilaan sivulla!',
        unit: 'hedelmää',
        module: seedRain,
        icon: [
            'M4.5 13.5h15l-1.6 5.4a2.4 2.4 0 0 1-2.3 1.6H8.4a2.4 2.4 0 0 1-2.3-1.6z',
            'M12 7.2c-1.5-1-4-.5-4 2 0 2 1.7 3.8 4 3.8s4-1.8 4-3.8c0-2.5-2.5-3-4-2z',
            'M12 7.2 12.6 4.5'
        ]
    },
    'delfiinin-reitti': {
        id: 'delfiinin-reitti',
        name: 'DELFIININ REITTI',
        pitch: 'Ui delfiinin kanssa korallien raoista läpi. Pelaa sitä oppilaan sivulla!',
        unit: 'porttia',
        module: dolphinRoute,
        icon: [
            'M8 12c1.8-2.9 4.3-4.5 7-4.5 3 0 5.3 1.7 6.5 4.5-1.2 2.8-3.5 4.5-6.5 4.5-2.7 0-5.2-1.6-7-4.5z',
            'M8 12 3.5 8.5c.6 1.2.9 2.3.9 3.5s-.3 2.3-.9 3.5z',
            'M13 9.5c.8 1.5.8 3.5 0 5',
            'M17.5 11h.01'
        ]
    },
    'jaaretki': {
        id: 'jaaretki',
        name: 'JÄÄRETKI',
        pitch: 'Juokse jäätiköllä, hyppää railojen yli ja väistä tuulenpuuskat. Pelaa sitä oppilaan sivulla!',
        unit: 'metriä',
        module: iceExpedition,
        icon: [
            'M2.5 19.5h19',
            'M6 19.5 10 9l4 6 2.5-4 3.5 8.5',
            'M9.5 5.5a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0z'
        ]
    }
}

const miniGameById = (gameId) => miniGames[gameId] ?? null

export { miniGames, miniGameById }
export default miniGames
