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

const miniGames = {
    'koskimelonta': {
        id: 'koskimelonta',
        name: 'KOSKIMELONTA',
        pitch: 'Meloo kosken läpi ja väistä kiviä. Pelaa sitä oppilaan sivulla!',
        unit: 'metriä',
        module: null,
        icon: [
            'M3 13.5c3.5 0 3.5 2 7 2s3.5-2 7-2 3.5 2 4 2',
            'M4.5 9.5h15l-2.5 4.2a3 3 0 0 1-2.6 1.5H9.6A3 3 0 0 1 7 13.7z',
            'M9 9.5 10.5 4.5',
            'M15 9.5 13.5 4.5'
        ]
    },
    'siemensade': {
        id: 'siemensade',
        name: 'SIEMENSADE',
        pitch: 'Nappaa putoavat siemenet koriin ennen kuin ne katoavat jokeen. Pelaa sitä oppilaan sivulla!',
        unit: 'siementä',
        module: null,
        icon: [
            'M4.5 13.5h15l-1.6 5.4a2.4 2.4 0 0 1-2.3 1.6H8.4a2.4 2.4 0 0 1-2.3-1.6z',
            'M9 10a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0z',
            'M14 5.5a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0z'
        ]
    },
    'delfiinin-reitti': {
        id: 'delfiinin-reitti',
        name: 'DELFIININ REITTI',
        pitch: 'Ui delfiinin kanssa korallien raoista läpi. Pelaa sitä oppilaan sivulla!',
        unit: 'porttia',
        module: dolphinRoute,
        icon: [
            'M3.5 9c4.5-3.5 10.5-2.5 13.5 1.5 1.4 1.9 2 4 2 6-2.6.4-5.2-.4-7-2',
            'M12 14.5c-3 1.6-6.4 1.3-8.5-1',
            'M13.5 7.5 16 4l1 4',
            'M8 10.5h.01'
        ]
    },
    'jaaretki': {
        id: 'jaaretki',
        name: 'JÄÄRETKI',
        pitch: 'Juokse jäätiköllä, hyppää railojen yli ja väistä tuulenpuuskat. Pelaa sitä oppilaan sivulla!',
        unit: 'metriä',
        module: null,
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
