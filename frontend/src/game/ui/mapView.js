import { px, renderScale } from './constants.js';
import { fundingStrip } from './fundingStrip.js';
import { isPressOnCanvas } from './canvasPress.js';

/**
 * How a map sheet sits on a small screen. Fitting the whole sheet, as the
 * desktop does, leaves a phone held upright with a strip of map and stops too
 * small for a finger. So below a certain size the sheet is zoomed in and the
 * pupil drags it, in whichever way the phone is held.
 *
 * It zooms just far enough that the map's stops reach full size, and no
 * further: the more of the route stays on screen, the less there is to drag.
 * Where the whole sheet already shows them at full size (a desktop, a tablet
 * on its side) nothing changes.
 */

/**
 * The sheet's rectangle in world coordinates, plus the world's size.
 * `minScale` is the scale at which the scene's stops reach full size; the
 * scene works it out, since only it knows how its stops are drawn.
 * A sheet smaller than the view along one axis is centred along it, as the
 * old letterbox fit did.
 *
 * With `coverSlivers`, a sheet that misses the view by only a sliver along
 * one axis is grown to cover it. A few pixels of desk along two edges read as
 * a stray border of uneven weight, not as the desk the sheet lies on; a real
 * margin (more than SLIVER of the view on each side) stays. The other axis
 * then overflows by as little, and the camera's follow of the buddy keeps the
 * route in view. Only for a sheet with no frame of its own to lose.
 */
const SLIVER = 0.04;

export function sheetRect(viewW, viewH, nativeW, nativeH, minScale, { coverSlivers = false } = {}) {
    const fit = Math.min(viewW / nativeW, viewH / nativeH);
    let scale = Math.max(fit, minScale);
    if (coverSlivers) {
        const gapX = (viewW - nativeW * scale) / 2 / viewW;
        const gapY = (viewH - nativeH * scale) / 2 / viewH;
        if (gapX > 0 && gapX < SLIVER) scale = viewW / nativeW;
        if (gapY > 0 && gapY < SLIVER) scale = viewH / nativeH;
    }

    const width = nativeW * scale;
    const height = nativeH * scale;
    return {
        scale,
        width,
        height,
        x: width < viewW ? Math.round((viewW - width) / 2) : 0,
        y: height < viewH ? Math.round((viewH - height) / 2) : 0,
        worldW: Math.max(viewW, Math.ceil(width)),
        worldH: Math.max(viewH, Math.ceil(height))
    };
}

/**
 * One finger drags the camera over the sheet. A press that moves less than
 * DRAG_SLOP is still a tap, so the stops on the map stay pressable; they run
 * their action through tap(), which drops it when the press was a drag.
 *
 * A drag that goes on past the world's bottom edge lifts the whole game and
 * shows the funders' strip under it (fundingStrip.js). The drag runs along one
 * line, camera scroll first and then the lift, so dragging back lowers the game
 * before it moves the map. The lift moves the canvas under the finger, so the
 * finger's travel is measured with it taken back out.
 */
const DRAG_SLOP = 8;

export class MapPanner {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.start = null;
        this.dragged = false;
        this.worldH = 0;
        // How far the game is lifted, in canvas pixels. A new map starts lowered.
        this.lift = 0;
        fundingStrip.reveal(0);

        // The flag is cleared on the next press, not on release: a stop's own
        // pointerup handler runs before the scene's, and must still see it.
        scene.input.on('pointerdown', (pointer) => {
            this.dragged = false;
            // A press on the page over the canvas (the backpack) drags nothing.
            if (!isPressOnCanvas(scene, pointer)) { this.start = null; return; }
            this.start = {
                x: pointer.x, y: pointer.y - this.lift,
                scrollX: this.camera.scrollX, along: this.camera.scrollY + this.lift
            };
        });
        scene.input.on('pointermove', (pointer) => {
            if (!this.start || !pointer.isDown) return;
            const dx = pointer.x - this.start.x;
            const dy = (pointer.y - this.lift) - this.start.y;
            if (!this.dragged && Math.hypot(dx, dy) < px(DRAG_SLOP)) return;
            this.dragged = true;
            this.camera.stopFollow();
            const along = this.start.along - dy;
            const maxScroll = Math.max(0, this.worldH - this.camera.height);
            this.camera.setScroll(this.start.scrollX - dx, Math.min(along, maxScroll));
            this.setLift(along - maxScroll);
        });
        scene.input.on('pointerup', () => { this.start = null; });
    }

    setLift(canvasPx) {
        const r = renderScale();
        fundingStrip.reveal(canvasPx / r);
        this.lift = fundingStrip.shown * r;
    }

    /** Lay the world out after a resize; the camera stays inside it. */
    setWorld(rect) {
        this.worldH = rect.worldH;
        this.camera.setBounds(0, 0, rect.worldW, rect.worldH);
        // The strip may have changed height with the screen's width.
        this.setLift(this.lift);
    }

    /** Run `action` only if the press that triggered it was not a drag. */
    tap(action) {
        return (...args) => {
            if (!this.dragged) action(...args);
        };
    }

    /**
     * Wire a stop on the map: it acts when it was both pressed and released,
     * with no drag in between. Release alone is not enough: a popup that
     * closes on press would hand the release on to the stop under it.
     */
    onTap(object, action) {
        let isPressed = false;
        object.on('pointerdown', (pointer) => { isPressed = isPressOnCanvas(this.scene, pointer); });
        object.on('pointerout', () => { isPressed = false; });
        object.on('pointerup', () => {
            if (isPressed && !this.dragged) action();
            isPressed = false;
        });
    }

    centerOn(x, y) {
        this.camera.stopFollow();
        this.camera.centerOn(x, y);
    }

    /** Keep `target` in view while it moves; a drag lets go of it. */
    follow(target) {
        this.camera.startFollow(target, true, 0.12, 0.12);
    }

    unfollow() {
        this.camera.stopFollow();
    }
}
