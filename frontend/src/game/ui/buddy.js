import mattiFigure from '../../assets/buddyAvatar/map/matti.png';
import pandaFigure from '../../assets/buddyAvatar/map/panda.png';
import ppFigure from '../../assets/buddyAvatar/map/pp.png';

/**
 * The buddy the pupil picked on the dashboard, as the simple ink figure drawn
 * for the maps by build/maps/draw_buddies.py. All three share one frame, so
 * one height scales them alike and Panda stays the shorter one.
 */
const FIGURES = {
    buddy_1: pandaFigure,
    buddy_2: ppFigure,
    buddy_3: mattiFigure
};

// How tall the shared frame stands on a map at the 1280-wide reference size,
// and its width over its height; draw_buddies.py prints both.
const FRAME_HEIGHT = 127;
export const BUDDY_ASPECT = 262 / 380;

const figureFor = (scene) => {
    const id = scene.game.registry.get('buddyId');
    return FIGURES[id] ? id : 'buddy_1';
};

export const buddyKey = (scene) => `buddy-${figureFor(scene)}`;

export const buddyHeight = () => FRAME_HEIGHT;

export function preloadBuddy(scene) {
    const key = buddyKey(scene);
    if (!scene.textures.exists(key)) {
        scene.load.image(key, FIGURES[figureFor(scene)]);
    }
}

/**
 * The buddy waits on a map by hopping on the spot, in an uneven rhythm so it
 * looks alive: one full hop, a pause, then two quicker, lower hops, a pause,
 * and round again. `onLift(lift)` gets the height of the hop as a share of a
 * full one (0 on the ground, 1 at the top) on every frame; the caller turns it
 * into pixels. Returns the tween chain, so the caller can stop it.
 */
export function startBuddyHop(scene, onLift) {
    const hop = { lift: 0 };
    const jump = (height, duration, pause) => ({
        targets: hop,
        lift: height,
        duration,
        yoyo: true,
        ease: 'Quad.easeOut',
        completeDelay: pause,
        onUpdate: () => onLift(hop.lift)
    });
    return scene.tweens.chain({
        loop: -1,
        tweens: [
            jump(1, 220, 650),
            jump(0.65, 140, 60),
            jump(0.65, 140, 700)
        ]
    });
}
