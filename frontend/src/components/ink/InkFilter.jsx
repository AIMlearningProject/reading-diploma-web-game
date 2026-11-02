// The hand-drawn edge shared by every screen drawn the way the scene art is
// drawn (see ink.css). Mount it once inside the screen that uses ink shapes:
// noise displaces each shape's edge, then the alpha is cut to on/off so no
// edge is smoothed, the way the art's lines wobble and step.
//
// #ink-hand-small draws the same stroke with room around it. The region is a
// share of the shape's own box, so on a 24px checkbox or a field's rule the
// 5% of #ink-hand is about a pixel and would clip the wobble flat.
//
// Two screens open at once render two identical filters under one id; url()
// takes the first, which draws the same.

import './ink.css'

function InkStroke() {
    return (
        <>
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
            <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
        </>
    )
}

export default function InkFilter() {
    return (
        <svg className="ink-defs" width="0" height="0" aria-hidden="true" focusable="false">
            <filter id="ink-hand" x="-5%" y="-5%" width="110%" height="110%">
                <InkStroke />
            </filter>
            <filter id="ink-hand-small" x="-30%" y="-30%" width="160%" height="160%">
                <InkStroke />
            </filter>
        </svg>
    )
}
