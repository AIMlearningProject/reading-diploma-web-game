import { DEPTHS } from '../ui/constants.js';
import { buddyHeight, buddyKey } from '../ui/buddy.js';
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
    }

    create(scene, savedIndex) {
        this.token = scene.add.image(0, 0, buddyKey(scene));
        this.tokenHeight = buddyHeight(scene);
        this.token.setDepth(DEPTHS.TOKEN);
        this.token.lastPointIndex = savedIndex;
        // A still figure sways a little, so it reads as standing there alive.
        scene.tweens.add({
            targets: this.token,
            angle: { from: -2.5, to: 2.5 },
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        return this.token;
    }

    updateScale(baseScale) {
        this.nodeOffsetY = 40 * baseScale;
        if (this.token) {
            this.token.setScale((this.tokenHeight * baseScale) / this.token.height);
        }
    }

    setPosition(x, y) {
        if (this.token) this.token.setPosition(x, y - this.nodeOffsetY);
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
