import { DEPTHS, COLORS, FONTS } from '../ui/constants.js';
import { ICON_KEYS } from '../ui/icons.js';

/**
 * Draws a continent's route.
 *
 * Most points are bends: small studs that only mark where the path goes. The
 * book nodes are the ones the pupil acts on -- one book each -- so they are
 * drawn larger, numbered, and are clickable. A finished node carries a tick, the
 * one the pupil is on is ringed, and the ones beyond it are faded but still
 * open: the pupil may start anywhere on the route.
 */
export default class WaypointRenderer {
    constructor(scene) {
        this.scene = scene;
        this.dotObjects = [];
        this.dotTexts = [];
    }

    render(pointPositions, baseScale, currentIndex, themeColor, videoCheckpoints, onVideoClick, route = {}) {
        this.destroy();

        const { nodeWaypoints = [], nodes = [], currentNodeIndex = 1, onNodeClick } = route;
        const nodeOfWaypoint = new Map(nodeWaypoints.map((wp, i) => [wp, i + 1]));

        pointPositions.forEach((pos, index) => {
            const isVideo = !!videoCheckpoints[index];
            const nodeIndex = nodeOfWaypoint.get(index);
            const node = nodeIndex ? nodes.find((n) => n.index === nodeIndex) : null;

            if (nodeIndex) {
                this._drawBookNode(pos, baseScale, themeColor, nodeIndex, node, currentNodeIndex, onNodeClick);
                return;
            }
            this._drawBend(pos, baseScale, themeColor, isVideo, index, videoCheckpoints, onVideoClick);
        });
    }

    _drawBookNode(pos, baseScale, themeColor, nodeIndex, node, currentNodeIndex, onNodeClick) {
        const isDone = (node?.progress ?? 0) >= 100;
        const isStarted = (node?.progress ?? 0) > 0 || !!node?.bookId;
        const isCurrent = nodeIndex === currentNodeIndex;
        const radius = 30 * baseScale;

        const shadow = this.scene.add.circle(pos.x, pos.y + 3 * baseScale, radius, 0x000000, 0.22)
            .setDepth(DEPTHS.BOOK_NODE - 1);
        this.dotObjects.push(shadow);

        // Parchment for a node still to read, the continent's own colour once
        // the pupil has picked a book for it.
        const fill = isDone ? COLORS.GOLD : (isStarted ? (themeColor || 0xffffff) : COLORS.PARCHMENT);
        const dot = this.scene.add.circle(pos.x, pos.y, radius, fill, isDone || isStarted ? 0.95 : 0.9)
            .setStrokeStyle(Math.max(2, 3.5 * baseScale), COLORS.GOLD)
            .setDepth(DEPTHS.BOOK_NODE);
        this.dotObjects.push(dot);

        const innerRing = this.scene.add.circle(pos.x, pos.y, radius - 5 * baseScale)
            .setStrokeStyle(Math.max(1, 1.2 * baseScale), COLORS.GOLD, 0.5)
            .setDepth(DEPTHS.BOOK_NODE);
        this.dotObjects.push(innerRing);

        if (isDone) {
            const iconSize = 30 * baseScale;
            const tick = this.scene.add.image(pos.x, pos.y, ICON_KEYS.CHECKMARK)
                .setDisplaySize(iconSize, iconSize)
                .setDepth(DEPTHS.BOOK_NODE_TEXT);
            this.dotTexts.push(tick);
        } else {
            const label = this.scene.add.text(pos.x, pos.y, String(nodeIndex), {
                fontFamily: FONTS.HEADING ?? FONTS.BODY,
                fontSize: `${Math.max(13, Math.round(20 * baseScale))}px`,
                color: isStarted ? '#FDFBF4' : '#1e3a5f',
                fontStyle: '800'
            }).setOrigin(0.5).setDepth(DEPTHS.BOOK_NODE_TEXT);
            this.dotTexts.push(label);
        }

        // The node the pupil is on gets a halo, so the route reads at a glance.
        if (isCurrent && !isDone) {
            const halo = this.scene.add.circle(pos.x, pos.y, radius + 7 * baseScale)
                .setStrokeStyle(Math.max(2, 2.5 * baseScale), COLORS.GOLD, 0.9)
                .setDepth(DEPTHS.BOOK_NODE - 1);
            this.dotObjects.push(halo);
            this.scene.tweens.add({
                targets: halo,
                scale: { from: 1, to: 1.12 },
                alpha: { from: 0.9, to: 0.35 },
                duration: 1100,
                yoyo: true,
                repeat: -1
            });
        }

        if (onNodeClick) {
            dot.setInteractive({ useHandCursor: true });
            dot.on('pointerdown', () => onNodeClick(nodeIndex));
        }
    }

    _drawBend(pos, baseScale, themeColor, isVideo, index, videoCheckpoints, onVideoClick) {
        const dotColor = isVideo ? COLORS.VIDEO_BLUE : (themeColor || 0xffffff);
        const dotRadius = (isVideo ? 22 : 9) * baseScale;

        const shadow = this.scene.add.circle(pos.x, pos.y + 2 * baseScale, dotRadius, 0x000000, 0.18)
            .setDepth(DEPTHS.WAYPOINT - 1);
        this.dotObjects.push(shadow);

        const dot = this.scene.add.circle(pos.x, pos.y, dotRadius, dotColor, isVideo ? 0.95 : 0.7)
            .setStrokeStyle(Math.max(1, 2 * baseScale), COLORS.GOLD, isVideo ? 1 : 0.6)
            .setDepth(DEPTHS.WAYPOINT);
        this.dotObjects.push(dot);

        if (isVideo) {
            const iconSize = 26 * baseScale;
            // Offset play icon slightly right (+8%) to visually center the triangle
            const img = this.scene.add.image(pos.x + dotRadius * 0.08, pos.y, ICON_KEYS.PLAY)
                .setDisplaySize(iconSize, iconSize).setDepth(DEPTHS.WAYPOINT_TEXT);
            this.dotTexts.push(img);

            dot.setInteractive({ useHandCursor: true });
            dot.on('pointerdown', () => {
                if (onVideoClick) onVideoClick(videoCheckpoints[index], index);
            });
        }
    }

    destroy() {
        this.dotObjects.forEach(d => d.destroy());
        this.dotTexts.forEach(t => t.destroy());
        this.dotObjects = [];
        this.dotTexts = [];
    }
}
