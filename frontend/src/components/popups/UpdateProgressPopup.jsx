import { useState } from "react"
import InfoButton from "../InfoButton"
import LiveBook from "./LiveBook"
import InkFilter from "../ink/InkFilter.jsx"
import "./UpdateProgressPopup.css"

function UpdateProgressPopup({ book, currentPct = 0, readOnly = false, onClose }) {
    const [pct, setPct] = useState(currentPct)

    const handlePageChange = (page) => {
        const newPct = Math.round((page / book.pageCount) * 100)
        setPct(Math.min(100, Math.max(0, newPct)))
    }

    return (
        <div className="progress-popup-overlay"
            onClick={() => onClose(pct)}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <InkFilter />
            {/* The sheet carries the ink; the body inside it scrolls, so the
                drop shadow is never clipped. */}
            <div className="progress-popup ink-shape ink-drop" onClick={(e) => e.stopPropagation()}>
                <div className="progress-popup-body">
                    {/* Title + Author + info/close buttons */}
                    <div className="progress-popup-info-wrapper">
                        {readOnly && (
                            <div className="progress-popup-info-btn">
                                <InfoButton
                                    ink
                                    info={'Olet jo lukenut tämän kirjan. Et voi lukea samaa kirjaa monta kertaa.'}
                                    textboxStyle={{ left: '120px' }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="progress-popup-close-wrapper">
                        <button className="progress-popup-close-btn ink-shape ink-shape--round ink-shape--thin" onClick={() => onClose(pct)}>
                            ✕
                        </button>
                    </div>
                    <h3 className="popup-book-title">{book.title}</h3>
                    <p className="popup-book-author">{book.author}</p>

                    <div className="popup-book-container">
                        <LiveBook pct={pct} isReadOnly={readOnly} />
                    </div>

                    {!readOnly && (<>
                        {/* Update Progress form */}
                        <h2>Päivitä edistyminen</h2>

                        <div className="progress-update-form">
                            {book.pageCount && (
                                <div className="editable-field">
                                    <span>Sivu</span>
                                    <span className="ink-field">
                                        <input
                                            type="number"
                                            min={0}
                                            max={book.pageCount}
                                            value={Math.round((pct / 100) * book.pageCount)}
                                            onChange={(e) => handlePageChange(e.target.value)}
                                        />
                                    </span>
                                    <span>/ {book.pageCount}</span>
                                </div>
                            )}

                            <div className="progress-pct">
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={pct}
                                    onChange={(e) => setPct(Number(e.target.value))}
                                    className="progress-slider-bar ink-range"
                                    style={{ '--ink-value': `${pct}%` }}
                                />
                            
                                <div className="editable-field">
                                    <span className="ink-field">
                                        <input
                                            type="number"
                                            value={pct}
                                            min={0}
                                            max={100}
                                            onChange={(e) => setPct(Number(e.target.value))}
                                        />
                                    </span>
                                    <span>%</span>
                                </div>
                            </div>
                        
                        </div>
                        <button className="save-progress-button ink-shape ink-shape--thin ink-drop" onClick={() => onClose(pct)}>Tallenna</button>
                    </>)}
                </div>
            </div>
        </div>
    );
}

export default UpdateProgressPopup