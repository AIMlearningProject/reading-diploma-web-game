import { CSS_COLORS, DEPTHS, FONTS, INK, px } from '../ui/constants.js';
import { ICON_KEYS, iconImage } from '../ui/icons.js';
import { circleHitArea, inkCircle } from '../ui/ink.js';
import { isMotionReduced } from '../ui/motion.js';

// On a small map the stops stop shrinking, so a finger can still hit them.
const MIN_NODE_RADIUS = 15;
const MIN_VIDEO_RADIUS = 11;

/** The radius of a video stop on a map drawn at `baseScale`. */
export const videoStopRadius = (baseScale) => Math.max(px(MIN_VIDEO_RADIUS), 19 * baseScale);

// How long the tick takes to land, so the scene can let the buddy set off after it.
export const STAMP_MS = 420;

/**
 * Draws a continent's stops.
 *
 * The book nodes are the ones the pupil acts on -- one book each -- so they are
 * large, numbered and clickable. A finished node carries a tick, one with a book
 * is sun, and so is the one to press next, where the buddy stands. The other route points are
 * bends: PathRenderer's curve shows them, so only the video stops are drawn.
 */
export default class WaypointRenderer {
    constructor(scene) {
        this.scene = scene;
        this.dotObjects = [];
        this.dotTexts = [];
        // The node whose tick is pressed on in this render, if any.
        this.stampNodeIndex = null;
    }

    render(pointPositions, baseScale, videoCheckpoints, onVideoClick, route = {}) {
        this.destroy();

        const { nodeWaypoints = [], nodes = [], currentNodeIndex = 1, onNodeClick, stampNodeIndex = null } = route;
        this.stampNodeIndex = stampNodeIndex;
        const nodeOfWaypoint = new Map(nodeWaypoints.map((wp, i) => [wp, i + 1]));

        pointPositions.forEach((pos, index) => {
            const nodeIndex = nodeOfWaypoint.get(index);
            const node = nodeIndex ? nodes.find((n) => n.index === nodeIndex) : null;

            if (nodeIndex) {
                this._drawBookNode(pos, baseScale, nodeIndex, node, currentNodeIndex, onNodeClick);
            } else if (videoCheckpoints[index]) {
                this._drawVideoStop(pos, baseScale, index, videoCheckpoints, onVideoClick);
            }
        });
    }

    _drawBookNode(pos, baseScale, nodeIndex, node, currentNodeIndex, onNodeClick) {
        const isDone = (node?.progress ?? 0) >= 100;
        const isStarted = (node?.progress ?? 0) > 0 || !!node?.bookId;
        const isCurrent = nodeIndex === currentNodeIndex && !isDone;
        const radius = Math.max(px(MIN_NODE_RADIUS), 28 * baseScale);

        let fill = INK.PAPER;
        if (isDone) fill = INK.GREEN;
        else if (isStarted || isCurrent) fill = INK.SUN;

        const dot = inkCircle(this.scene, pos.x, pos.y, radius, {
            fill, line: Math.max(px(2.5), INK.BIG * baseScale), drop: 4 * baseScale, seed: 30 + nodeIndex
        }).setDepth(DEPTHS.BOOK_NODE);
        this.dotObjects.push(dot);

        if (isDone) {
            const tick = iconImage(this.scene, pos.x, pos.y, ICON_KEYS.CHECKMARK, radius * 1.15)
                .setDepth(DEPTHS.BOOK_NODE_TEXT);
            this.dotTexts.push(tick);
            if (nodeIndex === this.stampNodeIndex) this._stamp(dot, tick, pos, radius, baseScale);
        } else {
            const label = this.scene.add.text(pos.x, pos.y, String(nodeIndex), {
                fontFamily: FONTS.BODY,
                fontSize: `${Math.round(radius * 0.9)}px`,
                color: CSS_COLORS.NAVY,
                fontStyle: '800'
            }).setOrigin(0.5).setDepth(DEPTHS.BOOK_NODE_TEXT);
            this.dotTexts.push(label);
        }

        if (onNodeClick) {
            dot.setInteractive(circleHitArea(radius));
            this._onTap(dot, () => onNodeClick(nodeIndex));
        }
    }

    /**
     * The node the pupil just finished gets its tick pressed on like a rubber
     * stamp: it comes down from above, the node gives under it, and a few
     * drops of the stamp's ink fly off its rim.
     */
    _stamp(dot, tick, pos, radius, baseScale) {
        if (isMotionReduced()) return;
        const scene = this.scene;
        const rest = tick.scale;
        const press = STAMP_MS * 0.55;

        // At full strength the whole way: a half-clear tick is a grey ghost of the ink.
        tick.setScale(rest * 1.6);
        scene.tweens.chain({
            targets: tick,
            tweens: [
                { scale: rest * 0.9, duration: press, ease: 'Quad.easeIn' },
                { scale: rest, duration: STAMP_MS - press, ease: 'Quad.easeOut' }
            ]
        });
        const dotRest = dot.scale;
        scene.tweens.add({
            targets: dot,
            scale: dotRest * 0.9,
            delay: press,
            duration: 90,
            yoyo: true,
            ease: 'Quad.easeOut'
        });

        scene.time.delayedCall(press, () => {
            const drops = 7;
            for (let i = 0; i < drops; i++) {
                const angle = (i / drops) * Math.PI * 2 + 0.4;
                // Solid ink blobs, wider than the route's own line (INK.MID). They
                // shrink away rather than fade: half-clear ink over the map reads as dirt.
                const size = Math.max(px(3), (i % 2 ? 4.5 : 6.5) * baseScale);
                const drop = inkCircle(scene, pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius, size, {
                    fill: INK.OUTLINE, line: Math.max(px(2.5), INK.SMALL * baseScale), seed: 90 + i
                // Under the buddy and the node, so they fly out from under the rim
                // and never land on the buddy as a stain.
                }).setDepth(DEPTHS.TOKEN - 1);
                this.dotTexts.push(drop);
                scene.tweens.add({
                    targets: drop,
                    x: drop.x + Math.cos(angle) * radius * 0.6,
                    y: drop.y + Math.sin(angle) * radius * 0.6,
                    duration: 260,
                    ease: 'Quad.easeOut'
                });
                scene.tweens.add({
                    targets: drop,
                    scale: 0,
                    delay: 200,
                    duration: 220,
                    ease: 'Quad.easeIn',
                    onComplete: () => drop.setVisible(false)
                });
            }
        });
    }

    _drawVideoStop(pos, baseScale, index, videoCheckpoints, onVideoClick) {
        const radius = videoStopRadius(baseScale);
        const dot = inkCircle(this.scene, pos.x, pos.y, radius, {
            line: Math.max(px(2.5), INK.MID * baseScale), seed: 50 + index
        }).setDepth(DEPTHS.BOOK_NODE);
        this.dotObjects.push(dot);

        const play = iconImage(this.scene, pos.x + radius * 0.06, pos.y, ICON_KEYS.PLAY, radius * 1.05)
            .setDepth(DEPTHS.BOOK_NODE_TEXT);
        this.dotTexts.push(play);

        dot.setInteractive(circleHitArea(radius));
        this._onTap(dot, () => {
            if (onVideoClick) onVideoClick(videoCheckpoints[index], index);
        });
    }

    // A drag of a zoomed map may start on a stop, so the scene's MapPanner
    // decides what counts as a tap (mapView.js).
    _onTap(dot, action) {
        if (this.scene.panner) this.scene.panner.onTap(dot, action);
        else dot.on('pointerdown', action);
    }

    destroy() {
        this.dotObjects.forEach((d) => {
            this.scene.tweens.killTweensOf(d);
            d.destroy();
        });
        this.dotTexts.forEach(t => {
            this.scene.tweens.killTweensOf(t);
            t.destroy();
        });
        this.dotObjects = [];
        this.dotTexts = [];
    }
}
