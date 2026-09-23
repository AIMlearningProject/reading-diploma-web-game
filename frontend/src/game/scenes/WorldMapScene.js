import Phaser from 'phaser';
import ReadingState from '../state.js';
import { preloadIcons, ICON_KEYS } from '../ui/icons.js';
import { COLORS, FONTS, uiScale as calcUiScale } from '../ui/constants.js';
import { makeParchmentBadge, makeParchmentTooltip, makeMedallion } from '../ui/panels.js';
import { preloadDesk, createDeskBackdrop, fitRect } from '../ui/desk.js';
import overallMapImg from '../../assets/overallMap.jpg';
import pandaWorldImg from '../../assets/buddyAvatar/panda/panda_world.png';

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
        this.pandaBuddy = null;
        this.pandaFloatTween = null;
        // Set by layoutMap(): how the native map coordinates map onto the canvas.
        this.mapScale = 1;
        this.mapOffsetX = 0;
        this.mapOffsetY = 0;
    }

    preload() {
        this.load.image('overallMap', overallMapImg);
        this.load.image('pandaWorld', pandaWorldImg);
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

        // --- 2. Continent markers ---
        this.pointGroup = this.add.group();
        this.routeGraphics = this.add.graphics().setDepth(4);

        const drawRoute = () => {
            this.routeGraphics.clear();
            const s = this.mapScale;
            this.routeGraphics.lineStyle(Math.max(1.5, 2.5 * s), COLORS.GOLD, 0.5);

            for (let i = 0; i < CONTINENTS.length - 1; i++) {
                const from = CONTINENTS[i];
                const to = CONTINENTS[i + 1];
                // Only draw the leg once the destination has been reached.
                if (!ReadingState.mapUnlock[to.mapKey]) break;
                this.drawDashedLine(
                    this.routeGraphics,
                    mapX(from.x), mapY(from.y),
                    mapX(to.x), mapY(to.y),
                    10 * s, 8 * s, 30 * s
                );
            }
        };

        const renderPoints = () => {
            if (!this.pointGroup || !this.pointGroup.scene || !this.pointGroup.active) return;

            this.pointGroup.clear(true, true);
            if (this.pandaBuddy) { this.pandaBuddy.destroy(); this.pandaBuddy = null; }
            if (this.pandaFloatTween) { this.pandaFloatTween.remove(); this.pandaFloatTween = null; }

            const s = this.mapScale;
            const currentMapKey = ReadingState.getCurrentContinent();

            CONTINENTS.forEach((pos, index) => {
                const finalX = mapX(pos.x);
                const finalY = mapY(pos.y);
                const isUnlocked = ReadingState.mapUnlock[pos.mapKey] === true;
                const isCurrent = pos.mapKey === currentMapKey;
                const isCompleted = ReadingState._continentCompletedFlags?.[pos.mapKey] === true;
                const isResubmittable = ReadingState.isLevelPendingResubmission(pos.mapKey);

                // The panda stands in for the marker on the continent the player is on.
                if (!isCurrent) {
                    const marker = makeMedallion(
                        this, index + 1, s,
                        { isUnlocked, isCompleted, isResubmittable },
                        isUnlocked ? () => this.scene.start(pos.mapKey) : null
                    );
                    marker.setPosition(finalX, finalY).setDepth(6);
                    this.pointGroup.add(marker);
                }

                // --- Label ---
                const labelFontSize = Math.max(12, Math.round(15 * s));
                const txt = this.add.text(0, 0, pos.name, {
                    fontFamily: FONTS.BODY, fontSize: `${labelFontSize}px`,
                    color: isUnlocked ? '#1e3a5f' : '#6b7280', fontStyle: '800'
                }).setOrigin(0.5);
                txt.setLetterSpacing(Math.max(0.5, 1 * s));

                const pillPadH = 11 * s;
                const pillPadV = 4 * s;
                const pillW = txt.width + pillPadH * 2;
                const pillH = txt.height + pillPadV * 2;
                const pillBg = this.add.graphics();
                pillBg.fillStyle(COLORS.PARCHMENT, isUnlocked ? 0.94 : 0.75)
                    .fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
                pillBg.lineStyle(Math.max(1, 1.5 * s), COLORS.GOLD, isUnlocked ? 0.9 : 0.4)
                    .strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);

                const labelContainer = this.add.container(finalX, finalY + 58 * s, [pillBg, txt]).setDepth(5);
                this.pointGroup.add(labelContainer);

                if (isCurrent) {
                    this.pandaBuddy = this.add.image(finalX, finalY, 'pandaWorld')
                        .setScale(s * 0.09).setDepth(10);
                    this.pandaBuddy.setInteractive({ useHandCursor: true })
                        .on('pointerdown', () => this.scene.start(pos.mapKey));
                    this.pointGroup.add(this.pandaBuddy);

                    const pandaTooltip = makeParchmentTooltip(
                        this, finalX, finalY - 34 * s, 'Klikkaa tutkiaksesi!', { s, depth: 11 }
                    ).setAlpha(0);
                    this.pointGroup.add(pandaTooltip);
                    this.tweens.add({ targets: pandaTooltip, alpha: 1, duration: 600, delay: 400 });

                    this.pandaFloatTween = this.tweens.add({
                        targets: this.pandaBuddy,
                        y: finalY - 10 * s,
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
        const margin = 18;

        const kirjat = makeParchmentBadge(
            this, margin, margin,
            `Luetut kirjat: ${ReadingState.booksRead}/8`,
            { iconKey: ICON_KEYS.BOOK, s: uiS, anchor: 'left' }
        );
        this.bookCountText = kirjat.container;
        this.bookCountLabel = kirjat.label;

        const poistu = makeParchmentBadge(
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

    /**
     * Dashed line with a gap left around each end so the dashes do not run
     * under the continent markers.
     */
    drawDashedLine(graphics, x1, y1, x2, y2, dash, gap, inset) {
        const total = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        if (total <= inset * 2) return;
        const nx = (x2 - x1) / total;
        const ny = (y2 - y1) / total;

        let travelled = inset;
        while (travelled < total - inset) {
            const end = Math.min(travelled + dash, total - inset);
            graphics.lineBetween(
                x1 + nx * travelled, y1 + ny * travelled,
                x1 + nx * end, y1 + ny * end
            );
            travelled = end + gap;
        }
    }
}

export default WorldMapScene;
