// Where a map sheet and its HUD sit, for the world map and the continent maps
// alike. The scene places the sheet with it and hands the panel to MapHud.jsx,
// so the canvas and the page agree on one set of numbers.
//
// On a wide screen the sheet stands at the left edge and the HUD is the
// backpack on the desk to its right. Anything narrower keeps the sheet where
// sheetRect() puts it, above the top of the backpack peeking in at the bottom
// edge (BAG_PEEK), which the pupil opens over the map.

// The backpack drawing's own box (BackpackArt.jsx draws in it). The bag is never
// drawn smaller than BAG_MIN_SCALE: below it its ink lines and the writing on it
// come out thinner than the rest of the page.
export const BAG_SIZE = { width: 502, height: 676 };
export const BAG_MIN_SCALE = 1;
export const BAG_MAX_SCALE = 1.25;

// CSS pixels. How much of the bag shows at the bottom edge on a narrow screen:
// its handle and the top of its flap.
export const BAG_PEEK = 92;

// CSS pixels. The panel area never grows past PANEL_MAX: past that it is
// centred on the desk to the sheet's right instead. MapHud scales the
// backpack whole to fit inside it, so the panel has room for it at BAG_MIN_SCALE.
export const HUD_MARGIN = 28;
export const PANEL_MIN = BAG_SIZE.width * BAG_MIN_SCALE;
export const PANEL_MAX = 640;

/**
 * The wide layout, or null when it does not fit.
 *
 * viewW, viewH, minScale and the returned figures are canvas pixels; `unit`
 * is the canvas pixels per CSS pixel (renderScale()). The sheet fills the
 * height at the left edge when that leaves the panel its room; a sheet too
 * wide for that (a continent) is fitted into the width left of the panel and
 * centred in the height. minScale is the smallest sheet scale at which what
 * the pupil presses on it is still full size: below it the wide layout is not
 * used, because the pupil would have to drag the sheet. The panel must also
 * hold the whole bag at BAG_MIN_SCALE.
 */
export function wideMapLayout(viewW, viewH, sheetW, sheetH, minScale, unit) {
    const margin = HUD_MARGIN * unit;
    if (viewH - 2 * margin < BAG_SIZE.height * BAG_MIN_SCALE * unit) return null;

    const widthLeft = viewW - PANEL_MIN * unit - 2 * margin;
    const scale = Math.min(viewH / sheetH, widthLeft / sheetW);
    if (scale < minScale) return null;

    // Rounded down, so the panel never loses the fraction of a pixel that
    // would put the bag under BAG_MIN_SCALE.
    const mapW = Math.floor(sheetW * scale);
    const mapH = Math.round(sheetH * scale);
    const room = viewW - mapW;
    const panelW = Math.min(PANEL_MAX * unit, room - 2 * margin);
    return {
        map: { scale, x: 0, y: Math.round((viewH - mapH) / 2), width: mapW, height: mapH },
        panel: {
            x: Math.round(mapW + (room - panelW) / 2),
            y: Math.round(margin),
            width: Math.floor(panelW),
            height: Math.round(viewH - 2 * margin)
        }
    };
}
