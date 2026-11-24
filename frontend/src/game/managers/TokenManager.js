import { DEPTHS } from '../ui/constants.js';
import { buddyHeight, buddyKey, startBuddyHop } from '../ui/buddy.js';
import ReadingState from '../state.js';
import { routeCurve, routeSample } from './PathRenderer.js';

export default class TokenManager {
    constructor() {
        this.token = null;
        this.tokenHeight = 0;
        // The buddy stands just above the node it is on, rather than on top of
        // it: a node carries its number, and being covered is what a pupil
        // would have to click through to open it.
        this.nodeOffsetY = 0;
        // Where the route puts the buddy, and how far up its hop has it now.
        this.place = { x: 0, y: 0 };
        this.hop = { lift: 0 };
        this.hopHeight = 0;
    }

    create(scene, savedIndex) {
        this.token = scene.add.image(0, 0, buddyKey(scene));
        this.tokenHeight = buddyHeight(scene);
        this.token.setDepth(DEPTHS.TOKEN);
        this.token.lastPointIndex = savedIndex;
        // The buddy waits by hopping on the spot, as on the world map. The hop
        // is a share of its height, kept apart from its place on the route so
        // walking (setPosition) and hopping never fight over token.y.
        startBuddyHop(scene, (lift) => {
            this.hop.lift = lift;
            this.applyPosition();
        });
        return this.token;
    }

    updateScale(baseScale) {
        // The ink buddy stands on top of the node, its feet on the node's rim,
        // so it is seen whole and marks the stop to press next.
        this.nodeOffsetY = 85 * baseScale;
        this.hopHeight = 14 * baseScale;
        if (this.token) {
            this.token.setScale((this.tokenHeight * baseScale) / this.token.height);
        }
    }

    setPosition(x, y) {
        this.place = { x, y };
        this.applyPosition();
    }

    applyPosition() {
        if (!this.token || !this.token.active) return;
        const lift = this.hop.lift * this.hopHeight;
        this.token.setPosition(this.place.x, this.place.y - this.nodeOffsetY - lift);
    }

    get lastPointIndex() {
        return this.token?.lastPointIndex ?? 0;
    }

    set lastPointIndex(val) {
        if (this.token) this.token.lastPointIndex = val;
    }

    animateAlongPath(scene, pointPositions, fromIndex, toIndex, sceneKey, onComplete) {
        if (fromIndex === toIndex) {
            if (onComplete) onComplete(toIndex);
            return;
        }

        const curve = routeCurve(pointPositions);

        const moveStep = (current) => {
            if (current === toIndex) {
                this.token.lastPointIndex = toIndex;
                ReadingState.tokenPositions ||= {};
                ReadingState.tokenPositions[sceneKey] = toIndex;
                if (onComplete) onComplete(toIndex);
                return;
            }

            const nextI = (current < toIndex) ? current + 1 : current - 1;
            const along = { at: routeSample(current) };

            scene.tweens.add({
                targets: along,
                at: routeSample(nextI),
                duration: 300,
                ease: 'Linear',
                onUpdate: () => {
                    const p = curve[Math.round(along.at)];
                    this.setPosition(p.x, p.y);
                },
                onComplete: () => {
                    moveStep(nextI);
                }
            });
        };

        moveStep(fromIndex);
    }

    snapToPoint(pointPositions, index, sceneKey) {
        const pos = pointPositions[index];
        this.setPosition(pos.x, pos.y);
        this.token.lastPointIndex = index;
        ReadingState.tokenPositions ||= {};
        ReadingState.tokenPositions[sceneKey] = index;
    }
}
