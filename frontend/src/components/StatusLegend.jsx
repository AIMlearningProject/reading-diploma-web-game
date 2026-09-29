import { useState } from 'react'

/**
 * What the colours on a pupil's row mean.
 *
 * Two different things are colour-coded and they are easy to mix up: the eight
 * legs of the voyage rail are the state of a whole continent, while the little
 * numbers inside an opened level are single books on that continent's route.
 * Both are explained here, side by side, for that reason.
 *
 * Collapsed by default -- a teacher needs it once, not on every visit.
 */

const LEVEL_STATES = [
    {
        status: 'incomplete',
        label: 'Suorittamatta',
        who: 'Oletus',
        text: 'Oppilas ei ole vielä lukenut kaikkia mantereen kirjoja ja vastannut kysymyksiin.'
    },
    {
        status: 'complete',
        label: 'Suoritettu',
        who: 'Oppilas',
        text: 'Oppilas on lukenut kirjat ja vastannut kysymyksiin. Odottaa tarkistustasi.'
    },
    {
        status: 'reviewed',
        label: 'Hyväksytty',
        who: 'Opettaja',
        text: 'Olet tarkistanut vastaukset ja hyväksynyt tason.'
    },
    {
        status: 'resubmit',
        label: 'Hylätty',
        who: 'Opettaja',
        text: 'Olet palauttanut tason oppilaalle. Oppilas näkee pyynnön pelissä ja voi vastata kysymyksiin uudelleen.'
    }
]

const BOOK_STATES = [
    { state: 'done', label: 'Luettu', text: 'Kirja on luettu loppuun.' },
    { state: 'started', label: 'Kesken', text: 'Kirja on valittu ja lukeminen on aloitettu.' },
    { state: 'empty', label: 'Ei kirjaa', text: 'Oppilas ei ole vielä valinnut kirjaa tälle etapille.' }
]

export default function StatusLegend() {
    const [open, setOpen] = useState(false)

    return (
        <div className="status-legend">
            <button
                type="button"
                className="status-legend-toggle"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                Mitä värit tarkoittavat?
                <svg
                    className={`expand-chevron ${open ? 'expand-chevron--open' : ''}`}
                    viewBox="0 0 12 12" width="12" height="12"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                >
                    <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
            </button>

            {open && (
                <div className="status-legend-body">
                    <section className="status-legend-group">
                        <h3 className="status-legend-heading">Tason tila</h3>
                        <p className="status-legend-intro">
                            Reittipalkin kahdeksan ruutua oppilaan nimen alla: yksi manner kutakin.
                        </p>
                        <ul className="status-legend-list">
                            {LEVEL_STATES.map(({ status, label, who, text }) => (
                                <li key={status} className="status-legend-item">
                                    <span className="voyage-rail voyage-rail--swatch" aria-hidden="true">
                                        <span className={`voyage-leg voyage-leg--${status}`}>1</span>
                                    </span>
                                    <div className="status-legend-text">
                                        <strong>{label}</strong>
                                        <span className="status-legend-who">{who}</span>
                                        <p>{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="status-legend-group">
                        <h3 className="status-legend-heading">Kirjan tila</h3>
                        <p className="status-legend-intro">
                            Pienet numerot avatun tason sisällä: yksi kirja kutakin etappia.
                        </p>
                        <ul className="status-legend-list">
                            {BOOK_STATES.map(({ state, label, text }) => (
                                <li key={state} className="status-legend-item">
                                    <span className={`node-row node-row--${state} status-legend-node`}>
                                        <span className="node-row-index">1</span>
                                    </span>
                                    <div className="status-legend-text">
                                        <strong>{label}</strong>
                                        <p>{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </div>
    )
}
