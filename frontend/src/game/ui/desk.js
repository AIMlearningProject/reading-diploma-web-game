// Drawn by build/maps/draw_desk.py, in the same ink style as the map sheets.
import woodDeskImg from '../../assets/maps/desk.jpg';
import { px } from './constants.js';

/**
 * The wooden desk every map sheet is laid on. Maps are fitted whole into the
 * canvas rather than cropped, and the desk fills whatever is left over.
 */

export const DESK_TEXTURE_KEY = 'woodDesk';
const VIGNETTE_KEY = 'desk-vignette';

// All below 0, so a scene's own layers keep their existing depths.
export const DESK_DEPTHS = {
    DESK:       -20,
    SHADE:      -19,
    VIGNETTE:   -18,
    MAP_SHADOW: -17
};

export function preloadDesk(scene) {
    if (!scene.textures.exists(DESK_TEXTURE_KEY)) {
        scene.load.image(DESK_TEXTURE_KEY, woodDeskImg);
    }
}

/**
 * Letterbox fit: the whole native rect, centred inside the view.
 */
export function fitRect(viewW, viewH, nativeW, nativeH) {
    const scale = Math.min(viewW / nativeW, viewH / nativeH);
    const width = nativeW * scale;
    const height = nativeH * scale;
    return {
        scale,
        width,
        height,
        x: Math.round((viewW - width) / 2),
        y: Math.round((viewH - height) / 2)
    };
}

/**
 * One-off radial gradient, stretched over the canvas so the desk darkens
 * towards the corners like a lamp-lit table.
 */
function ensureVignetteTexture(scene) {
    if (scene.textures.exists(VIGNETTE_KEY)) return;
    const size = 512;
    const canvasTexture = scene.textures.createCanvas(VIGNETTE_KEY, size, size);
    const ctx = canvasTexture.getContext();
    const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.65, 'rgba(0,0,0,0.1)');
    grd.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    canvasTexture.refresh();
}

/**
 * The sheet's shadow on the desk: a tight contact shadow and a wide soft one,
 * both centred under the sheet, so it falls the same on every side. It is soft
 * on purpose, unlike the dithered drop under the ink shapes.
 */
function ensureMapShadowTexture(scene, key, width, height, blur) {
    if (scene.textures.exists(key)) return;
    const margin = Math.ceil(blur * 3);
    const canvas = document.createElement('canvas');
    canvas.width = width + margin * 2;
    canvas.height = height + margin * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2c1e05';
    // A blur keeps only half its strength at the edge it starts from.
    [[blur * 2.6, 0.95], [blur * 0.9, 0.95]].forEach(([spread, alpha]) => {
        ctx.shadowColor = `rgba(44, 30, 5, ${alpha})`;
        ctx.shadowBlur = spread;
        ctx.fillRect(margin, margin, width, height);
    });
    scene.textures.addCanvas(key, canvas);
}

/**
 * Build the desk layers. Call the returned `layout(w, h, mapRect)` from the
 * scene's resize handler; `mapRect` is a fitRect() result for the map sheet
 * and may be omitted to skip the sheet's drop shadow.
 */
export function createDeskBackdrop(scene) {
    scene.cameras.main.setBackgroundColor(0x2a1d14);

    const desk = scene.add.image(0, 0, DESK_TEXTURE_KEY)
        .setOrigin(0).setDepth(DESK_DEPTHS.DESK).setScrollFactor(0);
    const shade = scene.add.graphics().setDepth(DESK_DEPTHS.SHADE).setScrollFactor(0);
    ensureVignetteTexture(scene);
    const vignette = scene.add.image(0, 0, VIGNETTE_KEY)
        .setOrigin(0).setDepth(DESK_DEPTHS.VIGNETTE).setScrollFactor(0);
    let mapShadow = null;
    let mapShadowKey = null;

    const layout = (w, h, mapRect) => {
        if (!desk.active) return;

        // Desk covers the canvas.
        const deskScale = Math.max(w / desk.width, h / desk.height);
        desk.setScale(deskScale)
            .setPosition((w - desk.width * deskScale) / 2, (h - desk.height * deskScale) / 2);

        // Knock the wood back so it never competes with the map.
        shade.clear();
        shade.fillStyle(0x0a192f, 0.1).fillRect(0, 0, w, h);
        vignette.setDisplaySize(w, h);

        // Shadow, so the map reads as a sheet lying on the desk. Stretching one
        // texture would stretch its blur, so each sheet size gets its own.
        if (mapShadow) mapShadow.destroy();
        mapShadow = null;
        if (!mapRect) return;
        const width = Math.round(mapRect.width);
        const height = Math.round(mapRect.height);
        const key = `desk-map-shadow-${width}x${height}`;
        if (mapShadowKey && mapShadowKey !== key && scene.textures.exists(mapShadowKey)) {
            scene.textures.remove(mapShadowKey);
        }
        mapShadowKey = key;
        ensureMapShadowTexture(scene, key, width, height, Math.max(px(10), Math.min(width, height) * 0.035));
        // The desk stays put while the camera pans a zoomed sheet (mapView.js),
        // but the shadow lies under the sheet, so it moves with it.
        mapShadow = scene.add.image(mapRect.x + width / 2, mapRect.y + height / 2, key)
            .setDepth(DESK_DEPTHS.MAP_SHADOW);
    };

    return { desk, shade, vignette, layout };
}
