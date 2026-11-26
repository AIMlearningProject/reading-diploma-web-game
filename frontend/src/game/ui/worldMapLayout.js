// Where the world map sheet and its HUD sit. WorldMapScene places the sheet
// with it and hands the result to WorldMapHud.jsx, which places the panel, so
// the canvas and the page agree on one set of numbers.
//
// On a wide screen the sheet fills the height at the left edge and the HUD is
// the backpack on the desk to its right. Anything narrower keeps the sheet where
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
// centred on the desk to the sheet's right instead. WorldMapHud scales the
// backpack whole to fit inside it, so the panel has room for it at BAG_MIN_SCALE.
export const HUD_MARGIN = 28;
export const PANEL_MIN = BAG_SIZE.width * BAG_MIN_SCALE;
export const PANEL_MAX = 640;

/**
 * The wide layout, or null when it does not fit.
 *
 * viewW, viewH, minScale and the returned figures are canvas pixels; `unit`
 * is the canvas pixels per CSS pixel (renderScale()). minScale is the sheet
 * scale at which its signs are full size: the wide layout is only used when
 * the sheet, fitted to the height, is at least that large, because otherwise
 * the pupil would have to drag it, and when the panel beside it holds the
 * whole bag at BAG_MIN_SCALE.
 */
export function wideWorldMapLayout(viewW, viewH, sheetW, sheetH, minScale, unit) {
    const scale = viewH / sheetH;
    if (scale < minScale) return null;

    const mapW = Math.round(sheetW * scale);
    const margin = HUD_MARGIN * unit;
    const room = viewW - mapW;
    if (room - 2 * margin < PANEL_MIN * unit) return null;

    const panelW = Math.min(PANEL_MAX * unit, room - 2 * margin);
    if (viewH - 2 * margin < BAG_SIZE.height * BAG_MIN_SCALE * unit) return null;
    return {
        map: { scale, x: 0, y: 0, width: mapW, height: viewH },
        panel: {
            x: Math.round(mapW + (room - panelW) / 2),
            y: Math.round(margin),
            width: Math.round(panelW),
            height: Math.round(viewH - 2 * margin)
        }
    };
}
