// Whether a press began on the game's own canvas.
//
// Phaser listens for presses on the whole window and hit-tests the ones that
// land outside the canvas too, by their position. So a press on something the
// page draws over the canvas (the backpack, its button on a phone lying right
// over a continent sign) also reaches whatever map object lies under it, and
// with the release that follows, the object acts. Everything pressable on the
// canvas, and the map drag, asks this first.

export function isPressOnCanvas(scene, pointer) {
    return pointer.downElement === scene.game.canvas;
}
