// Where the world map sheet and its HUD sit. WorldMapScene places the sheet
// with it and hands the result to WorldMapHud.jsx, which places the panel, so
// the canvas and the page agree on one set of numbers.
//
// On a wide screen the sheet fills the height at the left edge and the HUD is
// one panel on the desk to its right. Anything narrower keeps the sheet where
// sheetRect() puts it and the HUD shrinks to a corner group over the map.

// CSS pixels. The panel never grows past PANEL_MAX: past that it is centred on
// the desk to the sheet's right instead. PANEL_DESIGN is the size it was drawn
// at; WorldMapHud scales its contents by how this one compares.
export const HUD_MARGIN = 28;
export const PANEL_MIN = 400;
export const PANEL_MAX = 640;
export const PANEL_DESIGN = { width: 502, height: 672 };

/**
 * The wide layout, or null when it does not fit.
 *
 * viewW, viewH, minScale and the returned figures are canvas pixels; `unit`
 * is the canvas pixels per CSS pixel (renderScale()). minScale is the sheet
 * scale at which its signs are full size: the wide layout is only used when
 * the sheet, fitted to the height, is at least that large, because otherwise
 * the pupil would have to drag it.
 */
export function wideWorldMapLayout(viewW, viewH, sheetW, sheetH, minScale, unit) {
    const scale = viewH / sheetH;
    if (scale < minScale) return null;

    const mapW = Math.round(sheetW * scale);
    const margin = HUD_MARGIN * unit;
    const room = viewW - mapW;
    if (room - 2 * margin < PANEL_MIN * unit) return null;

    const panelW = Math.min(PANEL_MAX * unit, room - 2 * margin);
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
