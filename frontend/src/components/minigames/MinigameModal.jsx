import { useState, useEffect } from 'react'
import TilePuzzle from './TilePuzzle'
import arctic from '../../assets/arctic.png'
import europe from '../../assets/europe.png'
import asia from '../../assets/asia.png'
import northamerica from '../../assets/northamerica.png'
import southamerica from '../../assets/southamerica.png'
import africa from '../../assets/africa.png'
import oceania from '../../assets/oceania.png'
import antarctica from '../../assets/antarctica.png'

export default function MinigameModal({ reward, onClose }) {
    const [time, setTime] = useState(0)
    const [isTimerActive, setIsTimerActive] = useState(true)

    useEffect(() => {
        let interval = null;

        if (isTimerActive) {
            interval = setInterval(() => setTime((time) => time + 10), 10)
        } else {
            clearInterval(interval)
        }
        return () => {
            clearInterval(interval)
        }
    }, [isTimerActive])

    if (!reward) return null

    const entry = MINIGAMES[reward.name]
    if (!entry) return null

    const GameComponent = entry.component
    const gameProps = entry.props || {}
    gameProps.setIsTimerActive = setIsTimerActive

    return (
        <div className='popup-overlay'>
            <div className='popup-window'>
                <button className='popup-close' onClick={onClose}>
                    ✕
                </button>
                <span className="minigame-header">
                    <div className='minigame-header-left'></div>
                    <svg className='minigame-icon' xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 860" width="60px" fill="#9E7A2A">
                        <path d="m272-440 208 120 208-120-168-97v137h-80v-137l-168 97Zm168-189v-17q-44-13-72-49.5T340-780q0-58 41-99t99-41q58 0 99 41t41 99q0 48-28 84.5T520-646v17l280 161q19 11 29.5 29.5T840-398v76q0 22-10.5 40.5T800-252L520-91q-19 11-40 11t-40-11L160-252q-19-11-29.5-29.5T120-322v-76q0-22 10.5-40.5T160-468l280-161Zm0 378L200-389v67l280 162 280-162v-67L520-251q-19 11-40 11t-40-11Zm82.5-486.5Q540-755 540-780t-17.5-42.5Q505-840 480-840t-42.5 17.5Q420-805 420-780t17.5 42.5Q455-720 480-720t42.5-17.5ZM480-160Z" />
                    </svg>
                    <div className='minigame-header-right'>
                        <span className='minigame-time'>
                            {("0" + Math.floor((time / 60000) % 60)).slice(-2)}:
                            {("0" + Math.floor((time / 1000) % 60)).slice(-2)}.
                            {("0" + ((time / 10) % 100)).slice(-2)}
                        </span>
                    </div>
                </span>
                <div className="minigame-content">
                    <GameComponent {...gameProps} />
                </div>
            </div>
        </div>
    );
}
/*
// mapFi in studentDashboard.jsx
'ArcticMap': 'Pohjoisnapa',
'EuropeMap': 'Eurooppa',
'AsiaMap': 'Aasia',
'NorthAmericaMap': 'Pohjois Amerikka',
'SouthAmericaMap': 'Etelä Amerikka',
'AfricaMap': 'Afrikka',
'OceaniaMap': 'Oseania',
'AntarcticaMap': 'Etelämanner'
*/
const MINIGAMES = {
    'Pohjoisnapa': {  // <-- reward.name
        component: TilePuzzle,
        props: {
            src: arctic, // Puzzle image
            size: 3, // Puzzle size (e.g., 4 * 4 pieces)
            mode: ['drag', 'swap'][Math.floor(Math.random() * 2)] // Chooses randomly, swap / drag
        }
    },
    'Eurooppa': {
        component: TilePuzzle,
        props: {
            src: europe,
            size: 4,
            mode: ['drag', 'swap'][Math.floor(Math.random() * 2)]
        }
    },
    'Aasia': {
        component: TilePuzzle,
        props: {
            src: asia,
            size: [3, 4, 5, 6][Math.floor(Math.random() * 4)], // Chooses randomly
            mode: 'drag'
        }
    },
    'Pohjois Amerikka': {
        component: TilePuzzle,
        props: {
            src: northamerica,
            size: 4,
            mode: 'swap'
        }
    },
    'Etelä Amerikka': {
        component: TilePuzzle,
        props: {
            src: southamerica,
            size: 4,
            mode: 'swap'
        }
    },
    'Afrikka': {
        component: TilePuzzle,
        props: {
            src: africa,
            size: 4,
            mode: 'drag'
        }
    },
    'Oseania': {
        component: TilePuzzle,
        props: {
            src: oceania,
            size: 5,
            mode: 'swap'
        }
    },
    'Etelämanner': {
        component: TilePuzzle,
        props: {
            src: antarctica,
            size: 6,
            mode: 'drag'
        }
    },
}