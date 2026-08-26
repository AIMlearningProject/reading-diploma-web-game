import { useState } from "react"
import InfoButton from "../InfoButton"
import LiveBook from "./LiveBook"
import "./UpdateProgressPopup.css"

function UpdateProgressPopup({ book, currentPct = 0, readOnly = false, onClose }) {
    const [pct, setPct] = useState(currentPct)

    const handlePageChange = (page) => {
        const newPct = Math.round((page / book.pageCount) * 100)
        setPct(Math.min(100, Math.max(0, newPct)))
    }

    return (
        <div className="progress-popup-overlay">
            <div className="progress-popup">

                {/* Title + Author + info/close buttons */}
                <div className="progress-popup-info-wrapper">
                    {readOnly && (
                        <div className="progress-popup-info-btn">
                            <InfoButton
                                info={'Olet jo lukenut tämän kirjan. Et voi lukea samaa kirjaa monta kertaa.'}
                                textboxStyle={{ left: '120px' }}
                                buttonStyle={{
                                    width: '28px',
                                    height: '28px',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    border: '1px solid rgba(212, 175, 55, 0.35)',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                                }}
                            />
                        </div>
                    )}
                </div>
                <div className="progress-popup-close-wrapper">
                    <button className="progress-popup-close-btn" onClick={() => onClose(pct)}>
                        ✕
                    </button>
                </div>
                <h3 className="popup-book-title">{book.title}</h3>
                <p className="popup-book-author">{book.author}</p>

                <div className="popup-book-container">
                    <LiveBook pct={pct} />
                </div>

                {!readOnly && (
                    <>
                        {/* Progress fields */}
                        <h2>Päivitä edistyminen</h2>

                        <div className="progress-update-form">
                            {book.pageCount && (
                                <div className="editable-field">
                                    <span>Sivu</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={book.pageCount}
                                        value={Math.round((pct / 100) * book.pageCount)}
                                        onChange={(e) => handlePageChange(e.target.value)}
                                    />
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
                                    className="progress-slider-bar"
                                />
                                
                                <div className="editable-field">
                                    <input
                                        type="number"
                                        value={pct}
                                        min={0}
                                        max={100}
                                        onChange={(e) => setPct(Number(e.target.value))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                            
                        </div>
                        <button className="save-progress-button" onClick={() => onClose(pct)}>Tallenna</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default UpdateProgressPopup