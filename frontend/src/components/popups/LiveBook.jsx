import "./LiveBook.css";

export default function LiveBook({ pct, isReadOnly }) {
    const totalPages = 20;

    const pages = Array.from({ length: totalPages - 1}, (_, i) => {
        const threshold = Math.floor(((i + 1) / totalPages) * 100);
        const isFlipped = pct >= threshold;
        return { id: i + 1, isFlipped };
    });

    const isFrontCoverClosed = pct < 1;
    const isBackCoverClosed = pct > 99;

    return (
        <div className={"openbook-wrapper"} style={{ "--requiredSpace": isReadOnly ? "150px" : "295px" }}>
            <div className={`openbook${isFrontCoverClosed ? " openbook--unopened" : ""}${isBackCoverClosed ? " openbook--finished" : ""}`}>
                <div className={`book-cover ink-shape ${isFrontCoverClosed ? "" : "flipped"}`}
                    style={{ zIndex: isFrontCoverClosed ? totalPages + 2 : 1 }}
                />

                <div className={`book-cover ink-shape ${isBackCoverClosed ? "flipped" : ""}`}
                    style={{ zIndex: isBackCoverClosed ? totalPages + 2 : 1 }}
                />

                {/* The spine: the two halves' own outlines wobble apart there, so one
                    line drawn over the seam closes the gap. Only while the book is open. */}
                {!isFrontCoverClosed && !isBackCoverClosed && <div className="book-spine ink-shape" />}

                <div className="pages-stack">
                    {pages.map((p) => (
                        <div
                            key={p.id}
                            className={`page ink-shape ${p.isFlipped ? "flipped" : ""}`}
                            style={{ zIndex: totalPages - p.id }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}