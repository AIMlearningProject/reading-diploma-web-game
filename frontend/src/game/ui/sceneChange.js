// The one way a scene hands over to another (world map <-> continent).
//
// Phaser clears the canvas the moment the next scene starts, while the React
// layers (the loading sheet, the backpack) only change on React's next render,
// which the next scene's picture loading holds up. Starting the scene directly
// showed a black canvas with the old backpack still on it for a moment. So the
// React side is asked first (game.beforeSceneChange, set by PhaserGame.jsx): it
// puts the loading sheet up and the backpack away, and starts the scene once
// that has been painted. The sheet comes down when the next scene has run
// create() (watchSceneLoading in PhaserGame.jsx).

export function goToScene(scene, key) {
    if (scene.leaving) return;
    scene.leaving = true;
    scene.events.once('shutdown', () => { scene.leaving = false; });

    const start = () => scene.scene.start(key);
    if (scene.game.beforeSceneChange) scene.game.beforeSceneChange(start);
    else start();
}
