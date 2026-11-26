/**
 * The funders' strip on the game screen lies just below the game, out of
 * view. Dragging a map on past its bottom edge lifts the whole game, HUD and
 * all, and brings the strip up from underneath; dragging back lowers it again.
 *
 * PhaserGame.jsx owns the strip: it keeps `height` (CSS pixels) up to date and
 * sets `onReveal`, which lifts the game. MapPanner works out how far the drag
 * has gone past the map's edge and calls reveal().
 */
export const fundingStrip = {
    height: 0,
    shown: 0,
    onReveal: null,

    /** Lift the game by `cssPx` (clamped to the strip's height). */
    reveal(cssPx) {
        const next = Math.max(0, Math.min(this.height, cssPx));
        if (next === this.shown) return;
        this.shown = next;
        if (this.onReveal) this.onReveal(next);
    }
};
