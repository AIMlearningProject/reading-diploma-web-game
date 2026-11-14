import euEmblem from '../assets/funding/eu-cofunded-fi-h.png'
import elinvoimakeskus from '../assets/funding/elinvoimakeskus.png'
import kokkola from '../assets/funding/kokkola.svg'
import centria from '../assets/funding/centria-fi.png'
import kpedu from '../assets/funding/kpedu.png'
import aimlearning from '../assets/funding/aimlearning.png'
import { useEffect, useRef } from 'react'
import { PROJECT_URL } from '../links'
import './FundingNotice.css'

// The funder's logo row, in the order of the strip the project sent: the EU
// emblem first, then the partners. Each logo has its own height (--logo-h), set by
// eye so the marks look the same size: a wordmark needs less height than a
// two-line or pictorial mark to carry the same weight.
//
// EU rule (The use of the EU emblem in the context of EU programmes 2021-2027,
// p. 4): with other logos beside it, the emblem must be at least the same size
// as the biggest of them. Read strictly here: the flag alone (the funding
// statement beside it does not count) is at least as tall as every other logo
// and covers at least as much area. checkEmblemSize() enforces it in
// development, at whatever size the screen draws the row.
const LOGOS = [
    { src: euEmblem, alt: 'Euroopan unionin osarahoittama', h: 56, key: 'eu' },
    { src: elinvoimakeskus, alt: 'Elinvoimakeskus', h: 26, key: 'evk' },
    { src: kokkola, alt: 'Kokkola Karleby', h: 44, key: 'kokkola' },
    { src: centria, alt: 'Centria-ammattikorkeakoulu', h: 30, key: 'centria' },
    { src: kpedu, alt: 'Kpedu', h: 26, key: 'kpedu' },
    { src: aimlearning, alt: 'AIMlearning', h: 24, key: 'aim' }
]

// The flag, white rim included, is the left 354 of the emblem file's 1051 px.
const FLAG_SHARE = 354 / 1051

function checkEmblemSize(list) {
    const [eu, ...others] = [...list.querySelectorAll('img')].map((img) => img.getBoundingClientRect())
    const flag = { height: eu.height, area: eu.height * eu.width * FLAG_SHARE }
    for (const other of others) {
        if (other.height > flag.height + 0.5 || other.width * other.height > flag.area + 1) {
            console.error('FundingNotice: a partner logo is larger than the EU flag, which breaks the EU emblem rules.', { flag, other })
        }
    }
}

// The funding statement that a game built with EU co-funding must carry. The
// wording is the funder's; change it only on their say.
//   strip  logos only, in one low row: the game screen keeps it under the map
//          at all times. The full statement is on the welcome page.
export default function FundingNotice({ className = '', strip = false }) {
    const listRef = useRef(null)

    useEffect(() => {
        if (!import.meta.env.DEV) return
        const list = listRef.current
        const imgs = [...list.querySelectorAll('img')]
        const check = () => {
            if (imgs.every((img) => img.complete)) checkEmblemSize(list)
        }
        imgs.forEach((img) => img.addEventListener('load', check))
        window.addEventListener('resize', check)
        check()
        return () => {
            imgs.forEach((img) => img.removeEventListener('load', check))
            window.removeEventListener('resize', check)
        }
    }, [])

    return (
        <footer className={`funding-notice ${strip ? 'funding-notice--strip' : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
            <ul className="funding-notice-logos" ref={listRef}>
                {LOGOS.map(({ src, alt, h, key }) => (
                    <li key={key} className={`funding-notice-logo funding-notice-logo--${key}`}>
                        <img src={src} alt={alt} style={{ '--logo-h': `${h}px` }} />
                    </li>
                ))}
            </ul>
            {!strip && <p className="funding-notice-text">
                Tätä peliä on suunniteltu ja toteutettu Euroopan unionin osarahoittamassa
                AIMlearning – Tavoitteena työelämä tai opinnot -hankkeessa. Hanke on käynnissä
                1.2.2024–30.4.2027 välisenä aikana. Lisätietoa hankkeesta löydät osoitteessa{' '}
                <a href={PROJECT_URL} target="_blank" rel="noopener noreferrer">aimlearning.fi</a>
            </p>}
        </footer>
    )
}
