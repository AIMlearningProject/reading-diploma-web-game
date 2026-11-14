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
