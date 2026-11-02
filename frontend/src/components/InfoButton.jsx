import { useState, useEffect, useRef } from "react"
import "./InfoButton.css"

// ink: draw the button and its note in ink (ink.css), on the pupil's screens.
function InfoButton({ buttonStyle, textboxStyle, info, ink = false }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("pointerdown", handleClickOutside)
        return () => document.removeEventListener("pointerdown", handleClickOutside)
    }, [])

    return (
        <div className="info-container" ref={containerRef}>
            <button
                className={ink ? "info-button info-button--ink ink-shape ink-shape--thin ink-drop" : "info-button"}
                aria-label="Info"
                onClick={() => setIsOpen(!isOpen)}
                style={buttonStyle}
            >
                i
            </button>
            <div
                className={`info-text-wrapper ${isOpen ? "open" : ""}${ink ? " info-text-wrapper--ink ink-shape ink-shape--thin" : ""}`}
                style={textboxStyle}
            >
                <p className="info-text">
                    {info}
                </p>
            </div>
        </div>
    )
}

export default InfoButton