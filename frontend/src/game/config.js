// game/config.js

import Phaser from 'phaser';
import WorldMapScene from './scenes/WorldMapScene.js';
import continentRegistry from './scenes/continentRegistry.js';
import createContinentScene from './scenes/createContinentScene.js';
import { renderScale } from './ui/constants.js';

// Generate all 8 continent scenes from registry
const continentScenes = continentRegistry.map(config => createContinentScene(config));

// `width` and `height` are CSS pixels. The game runs at those times the device
// pixel ratio and `zoom` scales the canvas back down, so the backing store holds
// real device pixels instead of being stretched by the browser.
export default function createGameConfig(parent, width, height) {
  const dpr = renderScale();
  return {
    type: Phaser.AUTO,
    parent,
    dom: {
      createContainer: true
    },
    render: {
      antialias: true,
      roundPixels: true
    },
    scale: {
      // NONE, because RESIZE sets the game size to the parent's CSS size on
      // every resize and would undo the pixel ratio. PhaserGame.jsx observes the
      // parent and calls scale.resize() itself.
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.round(width * dpr),
      height: Math.round(height * dpr),
      zoom: 1 / dpr
    },
    scene: [
      WorldMapScene,
      ...continentScenes
    ]
  };
}
