// Placeholder desk texture: "Old wooden dark board" by Wirestock, Wikimedia
// Commons, CC BY 4.0. Swap for the hand-drawn version when it is ready.
import woodDeskImg from '../../assets/woodDesk.jpg';

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
    const mapShadow = scene.add.graphics().setDepth(DESK_DEPTHS.MAP_SHADOW).setScrollFactor(0);

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

        // Drop shadow, so the map reads as a sheet lying on the desk.
        mapShadow.clear();
        if (!mapRect) return;
        const spread = Math.max(8, Math.round(Math.min(mapRect.width, mapRect.height) * 0.025));
        for (let i = spread; i > 0; i--) {
            mapShadow.fillStyle(0x000000, 0.05).fillRoundedRect(
                mapRect.x - i,
                mapRect.y - i + spread * 0.45,
                mapRect.width + i * 2,
                mapRect.height + i * 2,
                i
            );
        }
    };

    return { desk, shade, vignette, mapShadow, layout };
}
