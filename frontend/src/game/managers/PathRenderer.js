import { DEPTHS, INK, px } from '../ui/constants.js';
import { inkDrawing, strokeDashed } from '../ui/ink.js';

const STEPS = 20;

/**
 * The route as a curve through its points (Catmull-Rom), STEPS samples to each
 * point, so the sample for point i is at index i * STEPS.
 */
export function routeCurve(points) {
    const curve = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;
        for (let step = 0; step < STEPS; step++) {
            const t = step / STEPS;
            const t2 = t * t;
            const t3 = t2 * t;
            const at = (k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t
                + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
            curve.push({ x: at('x'), y: at('y') });
        }
    }
    curve.push(points.at(-1));
    return curve;
}

export const routeSample = (index) => index * STEPS;

/**
 * Draws the whole route: an unbroken line for what the pupil has travelled and
 * dashes for what is still ahead, on a paper casing that keeps it readable over
 * any map.
 */
export default class PathRenderer {
    constructor(scene) {
        this.scene = scene;
        this.image = null;
        this.textureKey = null;
    }

    draw(pointPositions, targetIndex, scale) {
        // A zoomed sheet is larger than the screen (mapView.js), and the route
        // runs over all of it.
        const { width, height } = this.scene.mapWorld ?? this.scene.scale;
        const key = `route-${this.scene.scene.key}-${width}x${height}-${targetIndex}`;
        if (key === this.textureKey) return;
        this.clear();

        const curve = routeCurve(pointPositions);
        const cut = routeSample(targetIndex);
        const weight = Math.max(px(2), INK.MID * scale);

        const stroke = (g, points, lineWidth, color) => {
            g.strokeStyle = color;
            g.lineWidth = lineWidth;
            g.beginPath();
            points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
            g.stroke();
        };

        this.textureKey = key;
        this.image = inkDrawing(this.scene, key, width, height, (g) => {
            g.lineCap = 'round';
            g.lineJoin = 'round';
            stroke(g, curve, weight + 5 * scale, INK.PAPER);
            stroke(g, curve.slice(0, cut + 1), weight, INK.OUTLINE);
            g.lineWidth = weight - 0.5;
            strokeDashed(g, curve.slice(cut), 11 * scale, 9 * scale);
        }, { seed: 9 }).setDepth(DEPTHS.PATH);
    }

    clear() {
        if (this.image) {
            this.image.destroy();
            this.image = null;
        }
        if (this.textureKey && this.scene.textures.exists(this.textureKey)) {
            this.scene.textures.remove(this.textureKey);
        }
        this.textureKey = null;
    }
}
