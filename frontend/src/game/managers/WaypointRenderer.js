import { CSS_COLORS, DEPTHS, FONTS, INK, px } from '../ui/constants.js';
import { ICON_KEYS, iconImage } from '../ui/icons.js';
import { circleHitArea, inkCircle } from '../ui/ink.js';

// On a small map the stops stop shrinking, so a finger can still hit them.
const MIN_NODE_RADIUS = 15;
const MIN_VIDEO_RADIUS = 11;

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
    }

    render(pointPositions, baseScale, videoCheckpoints, onVideoClick, route = {}) {
        this.destroy();

        const { nodeWaypoints = [], nodes = [], currentNodeIndex = 1, onNodeClick } = route;
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

    _drawVideoStop(pos, baseScale, index, videoCheckpoints, onVideoClick) {
        const radius = Math.max(px(MIN_VIDEO_RADIUS), 19 * baseScale);
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
        this.dotTexts.forEach(t => t.destroy());
        this.dotObjects = [];
        this.dotTexts = [];
    }
}
