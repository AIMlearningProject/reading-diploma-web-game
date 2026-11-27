import Phaser from 'phaser';
import ReadingState from '../state.js';
import { preloadIcons } from '../ui/icons.js';
import { INK, px, renderScale } from '../ui/constants.js';
import { makeContinentSign, makeInkTooltip } from '../ui/panels.js';
import { preloadDesk, createDeskBackdrop } from '../ui/desk.js';
import { MapPanner, sheetRect } from '../ui/mapView.js';
import { BAG_PEEK, wideMapLayout } from '../ui/mapLayout.js';
import { goToScene } from '../ui/sceneChange.js';
import { continentName } from './continentRegistry.js';
import { BUDDY_ASPECT, buddyHeight, buddyKey, preloadBuddy, startBuddyHop } from '../ui/buddy.js';
import { inkDrawing, inkSheet, strokeDashed } from '../ui/ink.js';
import overallMapImg from '../../assets/overallMap.jpg';
import { isMotionReduced } from '../ui/motion.js';

// Native pixel size of overallMap.jpg. Every continent position below is
// expressed in these coordinates and scaled to whatever the canvas is.
const MAP_NATIVE_W = 1323;
const MAP_NATIVE_H = 1080;

// Ordered to match ReadingState.mapOrder, so the index is the level number - 1.
// The names come from continentRegistry.js.
const CONTINENTS = [
    { x: 545, y: 145, mapKey: 'ArcticMap' },
    { x: 712, y: 300, mapKey: 'EuropeMap' },
    { x: 1000, y: 280, mapKey: 'AsiaMap' },
    { x: 215, y: 300, mapKey: 'NorthAmericaMap' },
    { x: 345, y: 700, mapKey: 'SouthAmericaMap' },
    { x: 672, y: 715, mapKey: 'AfricaMap' },
    { x: 1082, y: 768, mapKey: 'OceaniaMap' },
    { x: 640, y: 898, mapKey: 'AntarcticaMap' }
].map((c) => ({ ...c, name: continentName(c.mapKey).toUpperCase() }));

class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMap');
        this.pointGroup = null;
        this.buddy = null;
        this.buddyFloatTween = null;
        // Set by layoutMap(): how the native map coordinates map onto the canvas.
        this.mapScale = 1;
        this.mapOffsetX = 0;
        this.mapOffsetY = 0;
    }

    preload() {
        this.load.image('overallMap', overallMapImg);
        preloadBuddy(this);
        preloadDesk(this);
        preloadIcons(this);
    }

    create() {
        // --- 1. Background: the map lies on a wooden desk ---
        const deskBackdrop = createDeskBackdrop(this);
        // The map is laid out on this image, which is never shown: what the pupil
        // sees is the ink-edged sheet baked from it in layoutMap().
        const bgMap = this.add.image(0, 0, 'overallMap').setOrigin(0).setVisible(false);
        this.panner = new MapPanner(this);

        const layoutMap = () => {
            if (!bgMap.active) return;
            const { width: w, height: h } = this.scale;

            // Full size is where the signs show their name plates, which are
            // what the pupil reads and presses (makeContinentSign).
            const fullSize = INK.WORLD_SCALE * INK.SIGN_MIN_SCALE * renderScale();
            // The world sheet goes wide only when it fills the height, flush with
            // the left, top and bottom edges (the layout chosen as E2); smaller,
            // the bag peeks in instead, as on the continents at that size.
            const wide = wideMapLayout(w, h, MAP_NATIVE_W, MAP_NATIVE_H, Math.max(fullSize, h / MAP_NATIVE_H), renderScale());
            let rect;
            if (wide) {
                rect = { ...wide.map, worldW: w, worldH: h };
            } else {
                // The top of the backpack shows along the bottom edge (BAG_PEEK in
                // mapLayout.js). The sheet is laid out in the room above it,
                // and the world reaches down past it, so a dragged map can always
                // bring its bottom out from behind the bag.
                const peek = BAG_PEEK * renderScale();
                const above = sheetRect(w, h - peek, MAP_NATIVE_W, MAP_NATIVE_H, fullSize);
                rect = { ...above, worldH: above.worldH + peek };
            }
            bgMap.setScale(rect.scale).setPosition(rect.x, rect.y);
            this.mapScale = rect.scale;
            this.mapOffsetX = rect.x;
            this.mapOffsetY = rect.y;
            this.mapWorld = { width: rect.worldW, height: rect.worldH };

            // No soft shadow: the sheet is drawn in ink, with its own dithered drop.
            deskBackdrop.layout(w, h, null, wide ? { clearFrom: rect.x + rect.width } : {});
            const sheetKey = `world-sheet-${rect.worldW}x${rect.worldH}-${Math.round(rect.x)}-${Math.round(rect.y)}`;
            if (this.sheetImage) {
                const oldKey = this.sheetImage.texture.key;
                this.sheetImage.destroy();
                if (oldKey !== sheetKey && this.textures.exists(oldKey)) this.textures.remove(oldKey);
            }
            this.sheetImage = inkSheet(
                this, sheetKey, this.textures.get('overallMap').getSourceImage(),
                { x: rect.x, y: rect.y, width: MAP_NATIVE_W * rect.scale, height: MAP_NATIVE_H * rect.scale },
                rect.worldW, rect.worldH
            ).setDepth(2);
            this.panner.setWorld(rect);

            // The HUD is React (components/hud/MapHud.jsx), drawn over
            // the canvas in CSS pixels. Nothing on the world map changes the
            // reading, so it is handed over only here.
            const r = renderScale();
            const panel = wide && {
                x: wide.panel.x / r, y: wide.panel.y / r,
                width: wide.panel.width / r, height: wide.panel.height / r
            };
            const here = ReadingState.getCurrentContinent();
            if (window.setMapHud) window.setMapHud({
                panel: panel || null,
                here,
                tag: { label: 'Takaisin leiriin', onPress: () => this.game.handleBackNavigation?.() },
                action: { label: 'Jatka matkaa', onPress: () => goToScene(this, here) }
            });
        };
        layoutMap();

        // Native map coordinates -> canvas coordinates.
        const mapX = (x) => this.mapOffsetX + x * this.mapScale;
        const mapY = (y) => this.mapOffsetY + y * this.mapScale;

        // --- 2. Continent signs ---
        this.pointGroup = this.add.group();

        const drawRoute = () => {
            const { width: w, height: h } = this.mapWorld;
            const key = `world-route-${w}x${h}`;
            if (this.routeImage) this.routeImage.destroy();

            const s = this.mapScale;
            this.routeImage = inkDrawing(this, key, w, h, (g) => {
                g.strokeStyle = INK.OUTLINE;
                g.lineWidth = Math.max(px(2), INK.SMALL * s);
                g.lineCap = 'round';
                for (let i = 0; i < CONTINENTS.length - 1; i++) {
                    const ax = mapX(CONTINENTS[i].x);
                    const ay = mapY(CONTINENTS[i].y);
                    const bx = mapX(CONTINENTS[i + 1].x);
                    const by = mapY(CONTINENTS[i + 1].y);
                    const total = Phaser.Math.Distance.Between(ax, ay, bx, by);
                    const nx = (bx - ax) / total;
                    const ny = (by - ay) / total;
                    // A gap at each end, so the dashes do not run under the markers.
                    const inset = 48 * s;
                    strokeDashed(g, [
                        { x: ax + nx * inset, y: ay + ny * inset },
                        { x: bx - nx * inset, y: by - ny * inset }
                    ], 16 * s, 13 * s);
                }
            }, { seed: 8 }).setDepth(4);
        };

        const renderPoints = () => {
            if (!this.pointGroup || !this.pointGroup.scene || !this.pointGroup.active) return;

            this.pointGroup.clear(true, true);
            if (this.buddyFloatTween) { this.buddyFloatTween.stop(); this.buddyFloatTween = null; }
            this.buddy = null;

            const s = this.mapScale;
            const k = s / INK.WORLD_SCALE;
            const currentMapKey = ReadingState.getCurrentContinent();

            const signs = CONTINENTS.map((pos, index) => {
                const finalX = mapX(pos.x);
                const finalY = mapY(pos.y);

                const sign = makeContinentSign(this, {
                    level: index + 1,
                    name: pos.name,
                    genre: ReadingState.genreFor(pos.mapKey),
                    state: {
                        isCompleted: ReadingState._continentCompletedFlags?.[pos.mapKey] === true,
                        isResubmittable: ReadingState.isLevelPendingResubmission(pos.mapKey)
                    },
                    withMarker: true,
                    s,
                    onClick: this.panner.tap(() => goToScene(this, pos.mapKey))
                });
                sign.setPosition(finalX, finalY).setDepth(6);
                this.pointGroup.add(sign);
                return { pos, sign, x: finalX, y: finalY };
            });

            // The buddy stands on the plate beside the numbered marker of the
            // continent the pupil is on, on whichever side no other sign takes up.
            const current = signs.find(({ pos }) => pos.mapKey === currentMapKey);
            if (!current) return;
            const { pos } = current;
            const height = buddyHeight(this) * 0.65 * k;
            const width = height * BUDDY_ASPECT;
            const markerR = 23 * k;          // the marker's radius in panels.js
            const feetY = current.y + 14 * k; // just onto the plate, whose top is at 12
            const reach = markerR + 4 * k + width / 2;
            const others = signs.filter((o) => o !== current).map((o) => o.sign.getBounds());
            const fits = (x) => {
                const r = new Phaser.Geom.Rectangle(x - width / 2, feetY - height, width, height);
                return others.every((o) => !Phaser.Geom.Intersects.RectangleToRectangle(r, o));
            };
            const right = current.x + reach;
            const left = current.x - reach;
            const buddyX = fits(right) || !fits(left) ? right : left;

            this.buddy = this.add.image(buddyX, feetY - height / 2, buddyKey(this)).setDepth(10);
            this.buddy.setScale(height / this.buddy.height);
            this.buddy.setInteractive({ useHandCursor: true });
            this.panner.onTap(this.buddy, () => goToScene(this, pos.mapKey));
            this.pointGroup.add(this.buddy);
            // The view opens on the continent the pupil is on.
            this.panner.centerOn(current.x, current.y);

            // The bubble goes over the buddy's head, unless that runs off the
            // top of the world (the sheet starts at the top edge, and the
            // first continent sits near it); then beside the head instead.
            const tipText = 'Klikkaa tutkiaksesi!';
            let tooltip = makeInkTooltip(this, buddyX, feetY - height - 6 * k, tipText, { s: k, depth: 11 });
            if (tooltip.getBounds().top < px(4)) {
                tooltip.destroy();
                const headY = feetY - height * 0.62;
                const sideX = buddyX + width / 2 + 2 * k;
                tooltip = makeInkTooltip(this, sideX, headY, tipText, { s: k, depth: 11, side: 'right' });
                if (tooltip.getBounds().right > this.mapWorld.width - px(4)) {
                    tooltip.destroy();
                    tooltip = makeInkTooltip(this, buddyX - width / 2 - 2 * k, headY, tipText, { s: k, depth: 11, side: 'left' });
                }
            }
            tooltip.setAlpha(0);
            this.pointGroup.add(tooltip);
            this.tweens.add({ targets: tooltip, alpha: 1, duration: 600, delay: 400 });

            const groundY = this.buddy.y;
            const buddy = this.buddy;
            if (!isMotionReduced()) {
                this.buddyFloatTween = startBuddyHop(this, (lift) => {
                    if (buddy.active) buddy.y = groundY - lift * 12 * k;
                });
            }
        };

        drawRoute();
        renderPoints();

        // --- 3. Resize handling ---
        const onResize = () => {
            if (!this.scene.isActive() || !bgMap || !bgMap.active) return;
            layoutMap();
            drawRoute();
            renderPoints();
        };

        this.scale.on('resize', onResize);
        this.events.on('shutdown', () => {
            this.scale.off('resize', onResize);
            if (window.setMapHud) window.setMapHud(null);
        });
    }
}

export default WorldMapScene;
