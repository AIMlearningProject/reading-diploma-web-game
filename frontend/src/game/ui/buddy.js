import mattiFigure from '../../assets/buddyAvatar/figures/matti.png';
import pandaFigure from '../../assets/buddyAvatar/figures/panda.png';
import ppFigure from '../../assets/buddyAvatar/figures/pp.png';

/**
 * The buddy the pupil picked on the dashboard. Panda is much shorter than the
 * other two on the sheet, so `height` is how tall each stands on a map at the
 * 1280-wide reference size.
 */
const FIGURES = {
    buddy_1: { src: pandaFigure, height: 112 },
    buddy_2: { src: ppFigure, height: 136 },
    buddy_3: { src: mattiFigure, height: 136 }
};

const figureFor = (scene) => {
    const id = scene.game.registry.get('buddyId');
    return FIGURES[id] ? id : 'buddy_1';
};

export const buddyKey = (scene) => `buddy-${figureFor(scene)}`;

export const buddyHeight = (scene) => FIGURES[figureFor(scene)].height;

export function preloadBuddy(scene) {
    const key = buddyKey(scene);
    if (!scene.textures.exists(key)) {
        scene.load.image(key, FIGURES[figureFor(scene)].src);
    }
}
