import { useState, useEffect, useRef } from "react"
import "./InfoButton.css"

function InfoButton({ positionStyle, info }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [])

    return (
        <div className="info-container" ref={containerRef}>
            <button className="info-button" aria-label="Info" onClick={() => setIsOpen(!isOpen)}>
                i
            </button>
            <div
                className={`info-text-wrapper ${isOpen ? "open" : ""}`}
                style={positionStyle}
            >
                <p className="info-text">
                    {info}
                </p>
            </div>
        </div>
    )
}

export default InfoButton