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
//
// `icon` is the game's ink icon, baked at 34px for <InkIcon>.

import delfiiniIcon from '../../assets/icons/game_delfiini_34.png'
import hedelmasadeIcon from '../../assets/icons/game_hedelmasade_34.png'
import jaaretkiIcon from '../../assets/icons/game_jaaretki_34.png'
import koskimelontaIcon from '../../assets/icons/game_koskimelonta_34.png'
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
        icon: koskimelontaIcon
    },
    'siemensade': {
        id: 'siemensade',
        name: 'HEDELMÄSADE',
        pitch: 'Nappaa puusta putoavat hedelmät koriin ennen kuin ne osuvat maahan. Pelaa sitä oppilaan sivulla!',
        unit: 'hedelmää',
        module: seedRain,
        icon: hedelmasadeIcon
    },
    'delfiinin-reitti': {
        id: 'delfiinin-reitti',
        name: 'DELFIININ REITTI',
        pitch: 'Ui delfiinin kanssa korallien raoista läpi. Pelaa sitä oppilaan sivulla!',
        unit: 'porttia',
        module: dolphinRoute,
        icon: delfiiniIcon
    },
    'jaaretki': {
        id: 'jaaretki',
        name: 'JÄÄRETKI',
        pitch: 'Juokse jäätiköllä, hyppää railojen yli ja väistä tuulenpuuskat. Pelaa sitä oppilaan sivulla!',
        unit: 'metriä',
        module: iceExpedition,
        icon: jaaretkiIcon
    }
}

const miniGameById = (gameId) => miniGames[gameId] ?? null

export { miniGames, miniGameById }
export default miniGames
