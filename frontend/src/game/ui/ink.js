import Phaser from 'phaser';
import { INK } from './constants.js';

/**
 * The hand-drawn edge of ink.css, for the canvas. The canvas cannot use the
 * #ink-hand filter (and Safari has no canvas filters at all), so the same steps
 * run here in plain JS: paint the straight shape, displace it with smooth noise,
 * then cut alpha to on/off so no edge is smoothed.
 *
 * Every result is a texture, shared by all scenes and kept by its key, so a shape
 * is baked once for each size it is shown at. Type is never baked: labels stay
 * Phaser text on top of the texture.
 */

const PAD = 10;
const FIELD = 512;
const PANEL_AMOUNT = 9;
const SMALL_AMOUNT = 5;

// One shared noise field, read at an offset per seed. Computing the noise per
// pixel made a full-canvas route take too long to redraw on every progress save.
const field = { x: null, y: null };

const perm = new Uint8Array(512);
{
    let s = 12345;
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = s % (i + 1);
        const swap = p[i];
        p[i] = p[j];
        p[j] = swap;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}

const fade = (t) => t * t * (3 - 2 * t);
const hash = (a, b) => perm[(perm[a & 255] + b) & 255] / 255;

function valueNoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const top = hash(xi, yi) * (1 - xf) + hash(xi + 1, yi) * xf;
    const bottom = hash(xi, yi + 1) * (1 - xf) + hash(xi + 1, yi + 1) * xf;
    return top * (1 - yf) + bottom * yf;
}

const fractal = (x, y) => valueNoise(x * 0.06, y * 0.06) * 0.67 + valueNoise(x * 0.12, y * 0.12) * 0.33;

function ensureField() {
    if (field.x) return;
    field.x = new Float32Array(FIELD * FIELD);
    field.y = new Float32Array(FIELD * FIELD);
    for (let y = 0; y < FIELD; y++) {
        for (let x = 0; x < FIELD; x++) {
            field.x[y * FIELD + x] = fractal(x, y) - 0.5;
            field.y[y * FIELD + x] = fractal(x + 211, y + 97) - 0.5;
        }
    }
}

/** Fill one output pixel from the source pixel the noise points it at. */
function displacePixel(from, to, x, y, cw, ch, at, amount) {
    const px = x + Math.round(field.x[at] * amount);
    const py = y + Math.round(field.y[at] * amount);
    if (px < 0 || py < 0 || px >= cw || py >= ch) return;
    const a = (py * cw + px) * 4;
    if (from[a + 3] < 128) return;
    const b = (y * cw + x) * 4;
    to[b] = from[a];
    to[b + 1] = from[a + 1];
    to[b + 2] = from[a + 2];
    to[b + 3] = 255;
}

function bake(width, height, paint, { amount = PANEL_AMOUNT, seed = 0 } = {}) {
    ensureField();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width + PAD * 2);
    canvas.height = Math.ceil(height + PAD * 2);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.translate(PAD, PAD);
    paint(ctx);

    const { width: cw, height: ch } = canvas;
    const from = ctx.getImageData(0, 0, cw, ch);
    const to = ctx.createImageData(cw, ch);
    const offX = Math.round(seed * 53.7);
    const offY = Math.round(seed * 91.3);

    for (let y = 0; y < ch; y++) {
        const row = ((y + offY) & (FIELD - 1)) * FIELD;
        for (let x = 0; x < cw; x++) {
            displacePixel(from.data, to.data, x, y, cw, ch, row + ((x + offX) & (FIELD - 1)), amount);
        }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.putImageData(to, 0, 0);
    return canvas;
}

function addTexture(scene, key, canvas) {
    scene.textures.addCanvas(key, canvas).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function ditherTile() {
    const tile = document.createElement('canvas');
    tile.width = tile.height = INK.DOT * 2;
    const g = tile.getContext('2d');
    g.fillStyle = INK.OUTLINE;
    g.fillRect(0, 0, INK.DOT, INK.DOT);
    g.fillRect(INK.DOT, INK.DOT, INK.DOT, INK.DOT);
    return tile;
}

/**
 * A shape as an image, placed by its own top-left corner: the padding and the
 * dithered drop live inside the texture and are hidden by the origin.
 */
export function inkShape(scene, x, y, width, height, options = {}) {
    const { radius = 12, fill = INK.PAPER, line = INK.MID, drop = 0, seed = 1 } = options;
    const w = Math.round(width);
    const h = Math.round(height);
    const r = Math.round(radius);
    const l = Math.round(line);
    const d = Math.round(drop);
    const key = `ink-${w}x${h}-${r}-${fill}-${l}-${d}-${seed}`;

    if (!scene.textures.exists(key)) {
        const shape = bake(w, h, (g) => {
            g.beginPath();
            g.roundRect(l / 2, l / 2, w - l, h - l, Math.max(1, r - l / 2));
            if (fill) {
                g.fillStyle = fill;
                g.fill();
            }
            g.lineWidth = l;
            g.strokeStyle = INK.OUTLINE;
            g.stroke();
        }, { seed, amount: Math.min(w, h) < 80 ? SMALL_AMOUNT : PANEL_AMOUNT });

        const canvas = document.createElement('canvas');
        canvas.width = shape.width + d;
        canvas.height = shape.height + d;
        const ctx = canvas.getContext('2d');
        if (d) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(PAD + d * 0.9, PAD + d, w, h, r);
            ctx.clip();
            ctx.fillStyle = ctx.createPattern(ditherTile(), 'repeat');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        ctx.drawImage(shape, 0, 0);
        addTexture(scene, key, canvas);
    }

    const image = scene.add.image(x, y, key);
    return image.setOrigin(PAD / image.width, PAD / image.height);
}

/** A round shape, placed by its centre. */
export function inkCircle(scene, x, y, radius, options = {}) {
    const image = inkShape(scene, 0, 0, radius * 2, radius * 2, { ...options, radius });
    return image
        .setOrigin((PAD + radius) / image.width, (PAD + radius) / image.height)
        .setPosition(x, y);
}

/**
 * Free strokes: paint() draws on a canvas the given size, in its coordinates.
 * The image's top-left corner is that canvas's (0, 0), so a full-view drawing
 * goes at (0, 0). Returned with its key so a scene can drop the old drawing.
 */
export function inkDrawing(scene, key, width, height, paint, options = {}) {
    if (!scene.textures.exists(key)) {
        addTexture(scene, key, bake(width, height, paint, { amount: 6, ...options }));
    }
    const image = scene.add.image(0, 0, key);
    return image.setOrigin(PAD / image.width, PAD / image.height);
}

/** A hit area for an image from inkCircle(), in its texture's coordinates. */
export function circleHitArea(radius) {
    return {
        hitArea: new Phaser.Geom.Circle(PAD + radius, PAD + radius, radius),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true
    };
}

/** Dashes along a list of points, carrying the dash across the corners. */
export function strokeDashed(g, points, dash, gap) {
    let isDrawing = true;
    let left = dash;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        let a = points[i - 1];
        const b = points[i];
        let d = Math.hypot(b.x - a.x, b.y - a.y);
        while (d > left) {
            const t = left / d;
            const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            if (isDrawing) g.lineTo(m.x, m.y);
            else g.moveTo(m.x, m.y);
            d -= left;
            a = m;
            isDrawing = !isDrawing;
            left = isDrawing ? dash : gap;
        }
        if (isDrawing) g.lineTo(b.x, b.y);
        else g.moveTo(b.x, b.y);
        left -= d;
    }
    g.stroke();
}
