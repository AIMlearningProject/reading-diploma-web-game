import Phaser from 'phaser';
import ReadingState from '../state.js';
import { preloadIcons, ICON_KEYS } from '../ui/icons.js';
import { INK, uiScale as calcUiScale, px, renderScale } from '../ui/constants.js';
import { makeContinentSign, makeInkBadge, makeInkTooltip } from '../ui/panels.js';
import { preloadDesk, createDeskBackdrop, fitRect } from '../ui/desk.js';
import { buddyHeight, buddyKey, preloadBuddy } from '../ui/buddy.js';
import { inkDrawing, strokeDashed } from '../ui/ink.js';
import overallMapImg from '../../assets/overallMap.jpg';

// Native pixel size of overallMap.jpg. Every continent position below is
// expressed in these coordinates and scaled to whatever the canvas is.
const MAP_NATIVE_W = 1323;
const MAP_NATIVE_H = 1080;

// Ordered to match ReadingState.mapOrder, so the index is the level number - 1.
const CONTINENTS = [
    { x: 545, y: 145, name: 'POHJOISNAPA', mapKey: 'ArcticMap' },
    { x: 712, y: 300, name: 'EUROOPPA', mapKey: 'EuropeMap' },
    { x: 1000, y: 280, name: 'AASIA', mapKey: 'AsiaMap' },
    { x: 215, y: 300, name: 'POHJOIS-AMERIKKA', mapKey: 'NorthAmericaMap' },
    { x: 345, y: 700, name: 'ETELÄ-AMERIKKA', mapKey: 'SouthAmericaMap' },
    { x: 672, y: 715, name: 'AFRIKKA', mapKey: 'AfricaMap' },
    { x: 1082, y: 768, name: 'OSEANIA', mapKey: 'OceaniaMap' },
    { x: 640, y: 898, name: 'ETELÄMANNER', mapKey: 'AntarcticaMap' }
];

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
        const bgMap = this.add.image(0, 0, 'overallMap').setOrigin(0).setDepth(2);

        const layoutMap = () => {
            if (!bgMap.active) return;
            const { width: w, height: h } = this.scale;

            const rect = fitRect(w, h, MAP_NATIVE_W, MAP_NATIVE_H);
            bgMap.setScale(rect.scale).setPosition(rect.x, rect.y);
            this.mapScale = rect.scale;
            this.mapOffsetX = rect.x;
            this.mapOffsetY = rect.y;

            deskBackdrop.layout(w, h, rect);
        };
        layoutMap();

        // Native map coordinates -> canvas coordinates.
        const mapX = (x) => this.mapOffsetX + x * this.mapScale;
        const mapY = (y) => this.mapOffsetY + y * this.mapScale;

        // --- 2. Continent signs ---
        this.pointGroup = this.add.group();

        const drawRoute = () => {
            const { width: w, height: h } = this.scale;
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
            if (this.buddyFloatTween) { this.buddyFloatTween.remove(); this.buddyFloatTween = null; }
            this.buddy = null;

            const s = this.mapScale;
            const k = s / INK.WORLD_SCALE;
            const currentMapKey = ReadingState.getCurrentContinent();

            CONTINENTS.forEach((pos, index) => {
                const finalX = mapX(pos.x);
                const finalY = mapY(pos.y);
                const isCurrent = pos.mapKey === currentMapKey;

                // The buddy stands in for the marker on the continent the player is on.
                const sign = makeContinentSign(this, {
                    level: index + 1,
                    name: pos.name,
                    genre: ReadingState.genreFor(pos.mapKey),
                    state: {
                        isCompleted: ReadingState._continentCompletedFlags?.[pos.mapKey] === true,
                        isResubmittable: ReadingState.isLevelPendingResubmission(pos.mapKey)
                    },
                    withMarker: !isCurrent,
                    s,
                    onClick: () => this.scene.start(pos.mapKey)
                });
                sign.setPosition(finalX, finalY).setDepth(6);
                this.pointGroup.add(sign);

                if (isCurrent) {
                    const height = buddyHeight(this) * 0.65 * k;
                    this.buddy = this.add.image(finalX, finalY - height / 2 + 14 * k, buddyKey(this)).setDepth(10);
                    this.buddy.setScale(height / this.buddy.height);
                    this.buddy.setInteractive({ useHandCursor: true })
                        .on('pointerdown', () => this.scene.start(pos.mapKey));
                    this.pointGroup.add(this.buddy);

                    const tooltip = makeInkTooltip(
                        this, finalX, finalY - height + 8 * k, 'Klikkaa tutkiaksesi!', { s: k, depth: 11 }
                    ).setAlpha(0);
                    this.pointGroup.add(tooltip);
                    this.tweens.add({ targets: tooltip, alpha: 1, duration: 600, delay: 400 });

                    this.buddyFloatTween = this.tweens.add({
                        targets: this.buddy,
                        y: this.buddy.y - 7 * k,
                        duration: 1200,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });
        };

        drawRoute();
        renderPoints();

        // --- 3. Corner badges ---
        const { width: initW } = this.scale;
        const uiS = calcUiScale(initW);
        const margin = 18 * renderScale();

        const kirjat = makeInkBadge(
            this, margin, margin,
            `Luetut kirjat: ${ReadingState.booksRead}/${ReadingState.targetBooks}`,
            { iconKey: ICON_KEYS.BOOK, s: uiS, anchor: 'left' }
        );
        this.bookCountText = kirjat.container;
        this.bookCountLabel = kirjat.label;

        const poistu = makeInkBadge(
            this, initW - margin, margin, 'POISTU',
            {
                iconKey: ICON_KEYS.DOOR_EXIT, s: uiS, anchor: 'right',
                onClick: () => { if (this.game.handleBackNavigation) this.game.handleBackNavigation(); }
            }
        );
        this.backBtn = poistu.container;
        this.backBtn._badgeWidth = poistu.width;

        // --- 4. Resize handling ---
        const onResize = () => {
            if (!this.scene.isActive() || !bgMap || !bgMap.active) return;
            layoutMap();
            drawRoute();
            renderPoints();
            if (this.backBtn && this.backBtn.active) {
                this.backBtn.setX(this.scale.width - margin - this.backBtn._badgeWidth);
            }
        };

        this.scale.on('resize', onResize);
        this.events.on('shutdown', () => {
            this.scale.off('resize', onResize);
        });
    }
}

export default WorldMapScene;
