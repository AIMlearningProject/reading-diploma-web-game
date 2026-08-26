import pageImg from "../../assets/bookPage.jpg"
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
            <div className="openbook">
                <div className={`book-cover ${isFrontCoverClosed ? "" : "flipped"}`}
                    style={{ zIndex: isFrontCoverClosed ? totalPages + 2 : 1 }}
                />

                <div className={`book-cover ${isBackCoverClosed ? "flipped" : ""}`}
                    style={{ zIndex: isBackCoverClosed ? totalPages + 2 : 1 }}
                />

                <div className="pages-stack">
                    {pages.map((p) => (
                        <img
                            key={p.id}
                            src={pageImg}
                            className={`page ${p.isFlipped ? "flipped" : ""}`}
                            style={{ zIndex: totalPages - p.id }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}