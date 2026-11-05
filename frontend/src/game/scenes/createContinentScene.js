import BaseMapScene from './BaseMapScene.js';
import { preloadIcons } from '../ui/icons.js';
import { preloadDesk } from '../ui/desk.js';
import { preloadBuddy } from '../ui/buddy.js';

export default function createContinentScene(config) {
    class ContinentScene extends BaseMapScene {
        constructor() {
            super(config.key, config.assetKey, config.title);
            this.rawPoints = config.rawPoints;
        }

        preload() {
            this.load.image(config.assetKey, config.assetPath);
            preloadBuddy(this);
            preloadIcons(this);
            preloadDesk(this);
        }
    }

    return ContinentScene;
}
