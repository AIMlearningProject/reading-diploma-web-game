import { useState, useRef, useEffect, useMemo } from "react";
import './TilePuzzle.css';

export default function TilePuzzle({ src, size = 4, mode = 'swap', setIsTimerActive }) {
    const [tileSize, setTileSize] = useState(0);
    const [tiles, setTiles] = useState([]);
    const [selected, setSelected] = useState(null);
    const layerCounter = useRef(5);

    const gameRef = useRef(null);
    const draggingRef = useRef(null);
    const dragPositions = useRef({});
    const dragStateRef = useRef({
        pointerId: null,
        startX: 0,
        startY: 0,
        moved: false,
    });

    const isPuzzleComplete = useMemo(() => tiles.every(tile => tile.placed), [tiles]);

    useEffect(() => {
        // Stops timer after puzzle has been completed
        if (tiles.length > 0 && tileSize > 0) setIsTimerActive(!isPuzzleComplete)
    }, [isPuzzleComplete])

    useEffect(() => {
        // Updates tilesize based on the size of the board (game)
        const updateTileSize = () => {
            if (!gameRef.current) return;
            const rect = gameRef.current.getBoundingClientRect();
            const boardSize = Math.min(rect.width, rect.height);
            setTileSize(boardSize / size);
        };

        updateTileSize();

        const resizeObserver = new ResizeObserver(() => updateTileSize());
        if (gameRef.current) {
            resizeObserver.observe(gameRef.current);
        }

        window.addEventListener('resize', updateTileSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateTileSize);
        };
    }, [size]);

    useEffect(() => {
        // Creates tiles, shuffles their positions, and makes sure they don't appear in the correct positions
        const t = [];
        if (mode === 'swap') {
            for (let i = 0; i < size * size; i++) {
                t.push({
                    id: i,
                    rotation: [90, 180, 270, 360][Math.floor(Math.random() * 4)],
                    position: i,
                    z: 5,
                    placed: false,
                });
            };

            // Shuffles tile positions and Makes sure they don't appear in the correct positions
            const shuffled = t.toSorted(() => Math.random() - 0.5);
            shuffled.forEach((tile, index) => {
                if (tile.id === index) {
                    const swapWith = index === shuffled.length - 1 ? index - 1 : index + 1;
                    const tempTile = shuffled[index];
                    shuffled[index] = shuffled[swapWith];
                    shuffled[swapWith] = tempTile;
                };
            });

            shuffled.forEach((tile, index) => tile.position = index);
            setTiles(shuffled);
        } else if (mode === 'drag') {
            const rect = gameRef.current.getBoundingClientRect();
            const boardSize = Math.min(rect.width, rect.height);
            const tempTileSize = boardSize / size;
            const maxPos = boardSize - tempTileSize;

            for (let i = 0; i < size * size; i++) {
                var x = Math.random() * maxPos;
                var y = Math.random() * maxPos;

                const correctX = Math.floor(i / size) * tempTileSize;
                const correctY = (i % size) * tempTileSize;

                const dx = Math.abs(x - correctX);
                const dy = Math.abs(y - correctY);

                const isTooCloseToCorrect = dx < tempTileSize / 3 || dy < tempTileSize / 3;
                if (isTooCloseToCorrect) {
                    x += tempTileSize;
                    y += tempTileSize;

                    if (x > maxPos) x -= tempTileSize * 2;
                    if (y > maxPos) y -= tempTileSize * 2;
                };

                t.push({
                    id: i,
                    rotation: [90, 180, 270, 360][Math.floor(Math.random() * 4)],
                    x,
                    y,
                    z: 5,
                    placed: false,
                });
            };
            setTiles(t);
        }
    }, [size, mode]);

    const liftTile = (tileId) => {
        // Stacks the tile on top of all other tiles
        const nextZ = layerCounter.current + 1;
        layerCounter.current = nextZ;

        setTiles(current =>
            current.map(tile =>
                tile.id === tileId
                    ? { ...tile, z: nextZ }
                    : tile
            )
        );
    };

    const rotateTile = (tile, index) => {
        if (tile.placed) return;

        const updatedTile = {
            ...tile,
            rotation: tile.rotation + 90
        };
        setTiles((prev) => {
            const next = prev.map((t, i) =>
                i === index
                    ? { ...t, rotation: updatedTile.rotation }
                    : t
            );
            return checkCorrectPositionInArray(next, updatedTile);
        });
    };

    const startDrag = (e, tile) => {
        e.preventDefault();
        if (mode !== 'drag') return;
        if (tile.placed) return;

        dragStateRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
        };

        draggingRef.current = tile.id;
        dragPositions.current[tile.id] = { x: tile.x ?? 0, y: tile.y ?? 0 };
        liftTile(tile.id);

        e.currentTarget?.setPointerCapture?.(e.pointerId);
    };

    const drag = (e, tile) => {
        e.preventDefault();
        if (mode !== 'drag') return;
        if (draggingRef.current !== tile.id) return;

        const movement = Math.hypot(
            e.clientX - dragStateRef.current.startX,
            e.clientY - dragStateRef.current.startY,
        );

        if (movement > 6) dragStateRef.current.moved = true;

        const rect = gameRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left - tileSize / 2;
        const rawY = e.clientY - rect.top - tileSize / 2;

        const maxPos = tileSize * size - tileSize;

        const x = Math.max(0, Math.min(rawX, maxPos))
        const y = Math.max(0, Math.min(rawY, maxPos))

        dragPositions.current[tile.id] = { x, y };
        e.currentTarget.style.transform = `translate(${x}px, ${y}px) rotate(${tile.rotation}deg)`;
    };

    const endDrag = (e, tile, index) => {
        e.preventDefault();
        if (mode !== 'drag') return;

        if (dragStateRef.current.moved) {
            const updatedTile = {
                ...tile,
                x: dragPositions.current[tile.id]?.x ?? tile.x ?? 0,
                y: dragPositions.current[tile.id]?.y ?? tile.y ?? 0,
            };

            setTiles(prev => {
                const next = prev.map(t =>
                    t.id === tile.id
                        ? { ...t, x: updatedTile.x, y: updatedTile.y }
                        : t
                );
                return checkCorrectPositionInArray(next, updatedTile);
            });
        } else {
            rotateTile(tile, index);
        }

        e?.currentTarget?.releasePointerCapture?.(dragStateRef.current.pointerId ?? e.pointerId);
        draggingRef.current = null;
        dragStateRef.current = {
            pointerId: null,
            startX: 0,
            startY: 0,
            moved: false,
        };
    };

    /**
     * 
     * @param {Array} prevTiles 
     * @param {Object} tile 
     * @returns If tile correctly placed, returns mutated array with correctly placed tile. Else returns array given as parameter.
     */
    const checkCorrectPositionInArray = (prevTiles, tile) => {
        const isCorrectRotation = tile.rotation % 360 === 0;

        if (mode === 'drag') {
            const correctRow = Math.floor(tile.id / size);
            const correctCol = tile.id % size;

            const targetX = correctCol * tileSize;
            const targetY = correctRow * tileSize;

            const dx = Math.abs(tile.x - targetX);
            const dy = Math.abs(tile.y - targetY);

            const isCloseEnough = dx < tileSize / 4 && dy < tileSize / 4;

            return isCloseEnough && isCorrectRotation ? prevTiles.map((t) =>
                t.id === tile.id
                    ? { ...t, x: targetX, y: targetY, z: 2, placed: true }
                    : t
            ) : prevTiles;
        };
        if (mode === 'swap') {
            const isCorrectPosition = tile.position === tile.id;
            if (isCorrectPosition && isCorrectRotation) {
                setSelected(null);
                return prevTiles.map(t =>
                    t.id === tile.id
                        ? { ...t, z: 2, placed: true }
                        : t
                );
            };
            return prevTiles;
        }

        return prevTiles;
    };

    const handleClick = (t, index) => {
        if (mode !== 'swap') return;
        if (t.placed) return;

        if (selected === null) {
            setSelected(index);
            return;
        };

        if (selected === index) {
            rotateTile(t, index);
            return;
        };

        swapTiles(selected, index);
    };

    const swapTiles = (a, b) => {
        setTiles(prev => {
            const copy = [...prev];
            const posA = copy[a].position;
            const posB = copy[b].position;

            copy[a] = { ...copy[a], position: posB };
            copy[b] = { ...copy[b], position: posA };

            return checkAllTilesCorrect(copy);
        });

        setSelected(null);
    };

    const checkAllTilesCorrect = (tiles) => {
        // Checks the correct placement of all tiles and marks them "placed" accordingly.
        // Returns the updated tiles array.
        return tiles.map(t => {
            const isCorrectPosition = t.position === t.id;
            const isCorrectRotation = t.rotation % 360 === 0;

            return {
                ...t,
                placed: isCorrectPosition && isCorrectRotation,
            };
        });
    };

    return (
        <div
            className="minigame"
            ref={gameRef}
            style={{
                "--size": size,
                "--tile-size": `${tileSize}px`,
            }}
        >
            {/* Target grid */}
            {Array.from({ length: size * size }, (_, i) => (
                <div key={i} className="cell" />
            ))}

            {/* Tiles */}
            {tiles.map((t, i) => {
                const row = Math.floor(t.position / size);
                const col = t.position % size;

                return (
                    <div
                        key={i}
                        className={`tile
                            ${mode === 'swap' && selected === i && !t.placed ? "selected" : ""
                            } ${t.placed ? "correct" : ""
                            } ${isPuzzleComplete ? "complete" : ""
                            }`}
                        style={{
                            zIndex: t.z ?? 5,
                            backgroundImage: `url(${src})`,
                            backgroundPosition: `-${(t.id % size) * tileSize}px -${Math.floor(t.id / size) * tileSize}px`,
                            backgroundSize: `${size * tileSize}px ${size * tileSize}px`,
                            transform: `translate(
                                ${mode === 'swap' ? col * tileSize : t.x ?? 0}px,
                                ${mode === 'swap' ? row * tileSize : t.y ?? 0}px
                            ) rotate(${t.rotation}deg)`,
                            "--tile-index": i,
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        onPointerDown={(e) => {
                            startDrag(e, t);
                            e.currentTarget.classList.add("dragging");
                        }}
                        onPointerMove={(e) => {
                            if (mode === 'drag') {
                                drag(e, t);
                            }
                        }}
                        onPointerUp={(e) => {
                            if (mode === 'swap') {
                                handleClick(t, i);
                                return;
                            };

                            if (mode === 'drag') {
                                endDrag(e, t, i);
                                e.currentTarget.classList.remove("dragging");
                            };
                        }}
                        onPointerCancel={(e) => {
                            if (mode === 'drag') {
                                endDrag(e, t, i);
                                e.currentTarget.classList.remove("dragging");
                            };
                        }}
                    />
                );
            })}
        </div>
    );
};
