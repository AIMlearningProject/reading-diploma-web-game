// Placeholder illustrations for the puzzle scenes, drawn as flat shapes.
//
// They are placeholders for the art, not for the animation: every scene carries
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

function ReefMaze({ state }) {
    return (
        <>
            <defs>
                <radialGradient id="ps-reef-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
                </radialGradient>
            </defs>

            <rect x="0" y="0" width="620" height="400" fill="#10405e" />
            <rect x="0" y="0" width="620" height="150" fill="#16567a" />
            <path d="M0 330q80-26 160-8t150 2 150-16 160 12v80H0z" fill="#0c3149" />

            {/* reef walls: the maze the turtle is stuck inside */}
            <g fill="#2f7188">
                <path d="M96 336q-10-70 16-112 24-38 10-84 34 22 30 74-4 50 16 122z" />
                <path d="M188 340q-16-58 4-96 20-36 6-76 30 20 28 66-2 46 14 106z" />
                <path d="M300 344q-14-52 2-92 18-42-2-84 40 26 34 84-6 54 6 92z" />
                <path d="M414 344q-12-46 4-84 16-38-4-74 38 24 32 78-6 50 4 80z" />
            </g>
            <g fill="#3f8ea3" opacity="0.7">
                <circle cx="132" cy="212" r="15" />
                <circle cx="228" cy="178" r="12" />
                <circle cx="330" cy="198" r="14" />
                <circle cx="438" cy="186" r="11" />
            </g>

            {/* target: the way out of the reef, dark until the route is known */}
            <g className="ps-glow">
                <ellipse cx="546" cy="228" rx="112" ry="118" fill="url(#ps-reef-glow)" />
            </g>
            <path
                className="ps-target"
                d="M498 346V244a48 48 0 0 1 96 0v102z"
                fill={state === 'solved' ? '#7fd4e8' : '#0b3049'}
            />
            <path d="M498 346V244a48 48 0 0 1 96 0v102" fill="none" stroke="#2f7188" strokeWidth="7" />

            {/* effect: the whistle's call spreading from the pupil's hand */}
            <g className="ps-effect" fill="none" stroke="#ffe9a8" strokeWidth="4" strokeLinecap="round">
                <path d="M74 300a54 54 0 0 1 0-72" />
                <path d="M96 314a86 86 0 0 1 0-100" opacity="0.75" />
                <path d="M118 328a118 118 0 0 1 0-128" opacity="0.5" />
            </g>
            <circle cx="56" cy="264" r="13" fill="#f0dfc0" stroke="#8f7d5c" strokeWidth="3" />

            {/* trail: the route out, once the dolphin leads the way */}
            <path
                className="ps-trail"
                d="M246 262q60-44 128-18t172-16"
                fill="none"
                stroke="#ffe9a8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="14 14"
            />

            {/* hint: where the trouble is */}
            <circle
                className="ps-hint"
                cx="240" cy="266" r="50"
                fill="none" stroke="#ffe9a8" strokeWidth="4" strokeDasharray="12 12" opacity="0.9"
            />

            {/* actor: the turtle, which swims out along the trail */}
            <g className="ps-actor">
                <ellipse cx="240" cy="268" rx="34" ry="26" fill="#6ba368" stroke="#2f5d33" strokeWidth="4" />
                <path d="M240 244v48M216 262h48" stroke="#2f5d33" strokeWidth="3" fill="none" />
                <circle cx="276" cy="256" r="11" fill="#6ba368" stroke="#2f5d33" strokeWidth="4" />
                <circle cx="280" cy="253" r="2.6" fill="#1e3a2a" />
                <ellipse cx="212" cy="246" rx="14" ry="8" fill="#6ba368" stroke="#2f5d33" strokeWidth="3" transform="rotate(-24 212 246)" />
                <ellipse cx="212" cy="290" rx="14" ry="8" fill="#6ba368" stroke="#2f5d33" strokeWidth="3" transform="rotate(24 212 290)" />
            </g>
        </>
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

function BareSlope({ state }) {
    return (
        <>
            <rect x="0" y="0" width="620" height="400" fill="#f0d9a8" />
            <path d="M0 0h620v130H0z" fill="#f6e6c0" />
            <circle cx="520" cy="72" r="34" fill="#f2c46a" />
            <path
                className="ps-target"
                d="M0 340V206q150-86 330-86t290 52v168z"
                fill={state === 'solved' ? '#6f9e57' : '#c09a63'}
            />
            <path d="M0 340V206q150-86 330-86t290 52" fill="none" stroke="#8a6a3c" strokeWidth="6" />
            <path d="M0 340h620v60H0z" fill="#3f6b86" />
            <g stroke="#a67c45" strokeWidth="5" fill="none" opacity="0.8">
                <path d="M90 266q22 34 6 74" />
                <path d="M250 232q26 40 8 84" />
                <path d="M430 240q24 38 6 80" />
            </g>

            <g className="ps-glow">
                <ellipse cx="310" cy="250" rx="240" ry="110" fill="#ffe9a8" opacity="0.45" />
            </g>

            {/* effect: the new trees coming up along the slope */}
            <g className="ps-effect">
                {[120, 214, 308, 402, 496].map((x, i) => (
                    <g key={x} transform={`translate(${x} ${226 + (i % 2) * 14})`}>
                        <rect x="-5" y="0" width="10" height="46" rx="4" fill="#6b4a2a" />
                        <circle cx="0" cy="-8" r="28" fill="#4f8a43" />
                        <circle cx="-18" cy="6" r="18" fill="#5c9b4d" />
                        <circle cx="18" cy="4" r="18" fill="#5c9b4d" />
                    </g>
                ))}
            </g>

            <path
                className="ps-trail"
                d="M96 318q110-58 210-54t222-26"
                fill="none" stroke="#fdf6e3" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 14"
            />

            {/* actor: the monkey, which climbs back up to the new trees */}
            <g className="ps-actor">
                <ellipse cx="96" cy="312" rx="20" ry="24" fill="#8a5a36" stroke="#4a2f18" strokeWidth="4" />
                <circle cx="96" cy="282" r="15" fill="#8a5a36" stroke="#4a2f18" strokeWidth="4" />
                <circle cx="96" cy="284" r="8" fill="#e0bc8c" />
                <circle cx="80" cy="276" r="6" fill="#8a5a36" stroke="#4a2f18" strokeWidth="3" />
                <circle cx="112" cy="276" r="6" fill="#8a5a36" stroke="#4a2f18" strokeWidth="3" />
                <path d="M114 320q26 6 22-26" fill="none" stroke="#4a2f18" strokeWidth="5" strokeLinecap="round" />
            </g>

            <circle
                className="ps-hint"
                cx="300" cy="252" r="66"
                fill="none" stroke="#8b4a2b" strokeWidth="4" strokeDasharray="12 12"
            />
        </>
    )
}

function LostCamp({ state }) {
    return (
        <>
            <rect x="0" y="0" width="620" height="400" fill="#dfeaf4" />
            <path d="M0 0h620v120H0z" fill="#c9dcec" />
            <path d="M0 150q120-62 240-16t180-4 200-40v90H0z" fill="#eef5fb" />
            <path d="M0 232q140 26 300-6t320 16v158H0z" fill="#ffffff" />
            <path d="M0 316q160-22 300 10t320-12v86H0z" fill="#e9f1f8" />

            <g className="ps-glow">
                <ellipse cx="470" cy="214" rx="120" ry="82" fill="#ffe9a8" opacity="0.55" />
            </g>

            {/* effect: the narrowed, sharpened view through the telescope */}
            <g className="ps-effect">
                <path d="M150 300 470 190l0 60L172 326z" fill="#ffe9a8" opacity="0.4" />
            </g>

            {/* target: the camp flag, indistinct until it is picked out */}
            <g className="ps-target" opacity={state === 'solved' ? 1 : 0.35}>
                <rect x="462" y="180" width="6" height="66" rx="3" fill="#3a2a10" />
                <path d="M468 182h40l-12 16 12 16h-40z" fill="#b8402f" />
                <path d="M436 246h64l-32-34z" fill="#e8dcc8" stroke="#8f7d5c" strokeWidth="4" />
            </g>

            <path
                className="ps-trail"
                d="M158 322q96-34 172-40t128-32"
                fill="none" stroke="#2c5f8a" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 14"
            />

            {/* actor: the expedition, which sets off toward the flag */}
            <g className="ps-actor">
                <circle cx="150" cy="292" r="13" fill="#1e3a5f" />
                <rect x="140" y="306" width="20" height="34" rx="9" fill="#1e3a5f" />
                <rect x="126" y="312" width="16" height="22" rx="6" fill="#c4973a" />
                <circle cx="188" cy="300" r="11" fill="#2c5f8a" />
                <rect x="179" y="312" width="18" height="30" rx="8" fill="#2c5f8a" />
            </g>

            <circle
                className="ps-hint"
                cx="470" cy="214" r="58"
                fill="none" stroke="#2c5f8a" strokeWidth="4" strokeDasharray="12 12"
            />
        </>
    )
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
            idle: 'Paljas rinne, jolta tulva on vienyt kaikki puut.',
            solved: 'Rinteellä kasvaa uusi metsä, ja apina kiipeää puihin.'
        }
    },
    'oceania-reef-maze': {
        Art: ReefMaze,
        label: {
            idle: 'Pieni kilpikonna koralliriutan käytävien keskellä.',
            solved: 'Kilpikonna ui valaistua reittiä pitkin ulos avomerelle.'
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
