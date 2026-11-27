import { DEPTHS, INK, px } from '../ui/constants.js';
import { buddyHeight, buddyKey, startBuddyHop } from '../ui/buddy.js';
import { inkCircle } from '../ui/ink.js';
import { isMotionReduced } from '../ui/motion.js';
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
        this.baseScale = 1;
        // While walking, the walk sets the lift and the waiting hop keeps quiet.
        this.walking = false;
        // After a walk the buddy stays on the ground until the waiting hop, which
        // ran on unseen meanwhile, comes down too. Taking the hop up mid-air sent
        // the buddy straight back up as it landed, so the landing dust looked as
        // if it burst out before the landing.
        this.groundedUntilHopLands = false;
    }

    create(scene, savedIndex) {
        this.token = scene.add.image(0, 0, buddyKey(scene));
        this.tokenHeight = buddyHeight(scene);
        this.token.setDepth(DEPTHS.TOKEN);
        this.token.lastPointIndex = savedIndex;
        // The buddy waits by hopping on the spot, as on the world map. The hop
        // is a share of its height, kept apart from its place on the route so
        // walking (setPosition) and hopping never fight over token.y.
        if (!isMotionReduced()) {
            startBuddyHop(scene, (lift) => {
                if (this.walking) return;
                if (this.groundedUntilHopLands) {
                    if (lift > 0.05) return;
                    this.groundedUntilHopLands = false;
                }
                this.hop.lift = lift;
                this.applyPosition();
            });
        }
        return this.token;
    }

    updateScale(baseScale) {
        // The ink buddy stands on top of the node, its feet on the node's rim,
        // so it is seen whole and marks the stop to press next.
        this.baseScale = baseScale;
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

        const arrive = () => {
            this.token.lastPointIndex = toIndex;
            ReadingState.tokenPositions ||= {};
            ReadingState.tokenPositions[sceneKey] = toIndex;
            if (onComplete) onComplete(toIndex);
        };

        if (isMotionReduced()) {
            const pos = pointPositions[toIndex];
            this.setPosition(pos.x, pos.y);
            arrive();
            return;
        }

        // The whole trip is one walk that sets off and slows down, in small
        // quick steps (about three a second) in place of the waiting hop.
        const curve = routeCurve(pointPositions);
        const steps = Math.abs(toIndex - fromIndex);
        const along = { at: routeSample(fromIndex) };
        const duration = 300 * steps;
        const strides = Math.max(2, Math.round(duration / 330));
        this.walking = true;
        scene.tweens.add({
            targets: along,
            at: routeSample(toIndex),
            duration,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const p = curve[Math.round(along.at)];
                this.hop.lift = 0.35 * Math.abs(Math.sin(tween.progress * Math.PI * strides));
                this.setPosition(p.x, p.y);
            },
            onComplete: () => {
                this.walking = false;
                this.groundedUntilHopLands = true;
                this.hop.lift = 0;
                this.applyPosition();
                this.puffDust(scene);
                arrive();
            }
        });
    }

    // Dust kicked up where the buddy lands: three small paper clouds inside an
    // ink line as heavy as the route's (INK.MID). They hold their size, then
    // shrink away fast at full strength: a fade, or a long shrink, thins the ink
    // line to a grey hairline.
    puffDust(scene) {
        const s = this.baseScale;
        const feetY = this.token.y + this.token.displayHeight / 2;
        const line = Math.max(px(3), INK.MID * s);
        [-1, 0, 1].forEach((side, i) => {
            const radius = Math.max(px(7), (side === 0 ? 14 : 11) * s);
            const puff = inkCircle(scene, this.token.x + side * 18 * s, feetY - 2 * s, radius, {
                fill: INK.PAPER, line, seed: 70 + i
            }).setDepth(DEPTHS.BOOK_NODE_TEXT + 1);
            scene.tweens.add({
                targets: puff,
                x: puff.x + side * 24 * s,
                y: puff.y - (side === 0 ? 12 : 6) * s,
                duration: 420,
                ease: 'Quad.easeOut'
            });
            scene.tweens.chain({
                targets: puff,
                tweens: [
                    { scale: 1.1, duration: 240, ease: 'Quad.easeOut' },
                    { scale: 0, duration: 160, ease: 'Quad.easeIn' }
                ],
                onComplete: () => puff.destroy()
            });
        });
    }

    snapToPoint(pointPositions, index, sceneKey) {
        const pos = pointPositions[index];
        this.setPosition(pos.x, pos.y);
        this.token.lastPointIndex = index;
        ReadingState.tokenPositions ||= {};
        ReadingState.tokenPositions[sceneKey] = index;
    }
}
