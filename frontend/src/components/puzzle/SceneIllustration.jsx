// Illustrations for the puzzle scenes. S6, S7 and S8 have their final art (see
// BareSlope, ReefMaze, LostCamp); S5 is still a placeholder drawn as flat shapes.
//
// The placeholders stand in for the art, not for the animation: each carries
// the six layers the solve timeline drives — hint, target, glow, effect, trail,
// actor — under one `data-state` on the root, so the final art can replace the
// shapes without touching PuzzleScene or its CSS. Keep the class names.
//
//   ps-hint    a dashed marker on the problem spot        visible -> fades out
//   ps-target  the thing the item fixes                   unsolved -> solved look
//   ps-glow    soft light around the target               hidden  -> visible
//   ps-effect  the item's effect, grows from its origin   hidden  -> visible
//   ps-trail   dashed path showing the outcome            hidden  -> visible
//   ps-actor   who is helped, moves along the trail       start   -> end position
//
// A scene drawn as two whole pictures uses one layer instead:
//
//   ps-swap    the solved picture over the unsolved one   hidden  -> visible

import slopeBefore from '../../assets/puzzles/s6/before.png'
import slopeAfter from '../../assets/puzzles/s6/after.png'
import reefBefore from '../../assets/puzzles/s7/before.png'
import reefAfter from '../../assets/puzzles/s7/after.png'
import campBefore from '../../assets/puzzles/s8/before.png'
import campAfter from '../../assets/puzzles/s8/after.png'

const VIEW_BOX = '0 0 620 400'

function Frame({ sceneId, state, label, children }) {
    return (
        <svg
            className="ps-art"
            viewBox={VIEW_BOX}
            data-scene={sceneId}
            data-state={state}
            role="img"
            aria-label={label}
            preserveAspectRatio="xMidYMid slice"
        >
            {children}
        </svg>
    )
}

function RiverCrossing({ state }) {
    return (
        <>
            <rect x="0" y="0" width="620" height="400" fill="#cfe3ee" />
            <path d="M0 0h620v112H0z" fill="#b9d8e6" />
            <path d="M0 96q90-30 170-10t150-4 150 14 150-12v60H0z" fill="#3f6e4a" />
            <rect x="0" y="146" width="620" height="180" fill="#8a6a44" />
            <g stroke="#a1825c" strokeWidth="5" fill="none" opacity="0.8">
                <path d="M0 184q140 18 300 0t320 10" />
                <path d="M0 236q160-20 300 2t320-8" />
                <path d="M0 288q120 16 300-4t320 8" />
            </g>
            <path d="M0 326h620v74H0z" fill="#5b7f4b" />

            {/* the children waiting on the far bank */}
            <g fill="#1e3a5f">
                <circle cx="500" cy="86" r="11" /><rect x="492" y="100" width="16" height="30" rx="7" />
                <circle cx="536" cy="90" r="10" /><rect x="529" y="103" width="15" height="27" rx="7" />
            </g>

            <g className="ps-glow">
                <ellipse cx="300" cy="238" rx="150" ry="96" fill="#ffe9a8" opacity="0.5" />
            </g>

            {/* trail: the crossing the ferry can make once it has a paddle */}
            <path
                className="ps-trail"
                d="M270 296q70-70 160-96t90-88"
                fill="none" stroke="#fdf6e3" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 14"
            />

            {/* effect: the wake the paddle pushes out behind the ferry */}
            <g className="ps-effect" fill="none" stroke="#fdf6e3" strokeWidth="4" strokeLinecap="round">
                <path d="M206 288q-40 8-66 26" />
                <path d="M200 262q-46 2-78 18" opacity="0.7" />
            </g>

            {/* actor and target are the same ferry: it lights up and it moves */}
            <g className="ps-actor">
                <path
                    className="ps-target"
                    d="M212 260h116l-20 42a14 14 0 0 1-12 7h-52a14 14 0 0 1-12-7z"
                    fill={state === 'solved' ? '#b07a3e' : '#6f645a'}
                />
                <path d="M212 260h116l-20 42a14 14 0 0 1-12 7h-52a14 14 0 0 1-12-7z" fill="none" stroke="#4a3520" strokeWidth="5" />
                <rect x="262" y="214" width="12" height="48" rx="5" fill="#4a3520" />
                <path d="M274 216h44l-44 24z" fill="#fdf6e3" stroke="#4a3520" strokeWidth="4" />
            </g>

            <circle
                className="ps-hint"
                cx="270" cy="270" r="62"
                fill="none" stroke="#8b4a2b" strokeWidth="4" strokeDasharray="12 12"
            />
        </>
    )
}

// The final art comes as two whole pictures rather than layers, so the solve
// is a crossfade from one to the other instead of the six-layer timeline the
// placeholder uses.
function Swap({ before, after }) {
    return (
        <>
            <image href={before} x="0" y="0" width="620" height="400" />
            <image className="ps-swap" href={after} x="0" y="0" width="620" height="400" />
        </>
    )
}

function BareSlope() {
    return <Swap before={slopeBefore} after={slopeAfter} />
}

function ReefMaze() {
    return <Swap before={reefBefore} after={reefAfter} />
}

function LostCamp() {
    return <Swap before={campBefore} after={campAfter} />
}

const SCENES = {
    'south-america-river-crossing': {
        Art: RiverCrossing,
        label: {
            idle: 'Tulvinut joki, jonka rannalla lossi seisoo ilman melaa.',
            solved: 'Lossi ylittää joen, ja lapset odottavat toisella rannalla.'
        }
    },
    'africa-bare-slope': {
        Art: BareSlope,
        label: {
            idle: 'Kuiva rinne, jolla surullinen apina istuu kuolleiden puiden keskellä.',
            solved: 'Rinne on taas vihreä, ja iloinen apina istuu hedelmäpuiden keskellä.'
        }
    },
    'oceania-reef-maze': {
        Art: ReefMaze,
        label: {
            idle: 'Pieni surullinen kala meriheinien keskellä syvässä vedessä.',
            solved: 'Iloinen kala ui ylös kirkkaaseen matalaan veteen.'
        }
    },
    'antarctica-lost-camp': {
        Art: LostCamp,
        label: {
            idle: 'Valkoinen lumikenttä, jolla leiriä ei erota.',
            solved: 'Leirin punainen lippu erottuu, ja retkikunta kulkee sitä kohti.'
        }
    }
}

export default function SceneIllustration({ sceneId, solved }) {
    const entry = SCENES[sceneId]
    if (!entry) return null

    const state = solved ? 'solved' : 'idle'
    const { Art, label } = entry

    return (
        <Frame sceneId={sceneId} state={state} label={label[state]}>
            <Art state={state} />
        </Frame>
    )
}
