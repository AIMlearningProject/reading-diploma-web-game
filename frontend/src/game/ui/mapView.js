import { px } from './constants.js';

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
 */
export function sheetRect(viewW, viewH, nativeW, nativeH, minScale) {
    const fit = Math.min(viewW / nativeW, viewH / nativeH);
    const scale = Math.max(fit, minScale);

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
 */
const DRAG_SLOP = 8;

export class MapPanner {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.start = null;
        this.dragged = false;

        // The flag is cleared on the next press, not on release: a stop's own
        // pointerup handler runs before the scene's, and must still see it.
        scene.input.on('pointerdown', (pointer) => {
            this.dragged = false;
            this.start = {
                x: pointer.x, y: pointer.y,
                scrollX: this.camera.scrollX, scrollY: this.camera.scrollY
            };
        });
        scene.input.on('pointermove', (pointer) => {
            if (!this.start || !pointer.isDown) return;
            const dx = pointer.x - this.start.x;
            const dy = pointer.y - this.start.y;
            if (!this.dragged && Math.hypot(dx, dy) < px(DRAG_SLOP)) return;
            this.dragged = true;
            this.camera.stopFollow();
            this.camera.setScroll(this.start.scrollX - dx, this.start.scrollY - dy);
        });
        scene.input.on('pointerup', () => { this.start = null; });
    }

    /** Lay the world out after a resize; the camera stays inside it. */
    setWorld(rect) {
        this.camera.setBounds(0, 0, rect.worldW, rect.worldH);
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
        object.on('pointerdown', () => { isPressed = true; });
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
