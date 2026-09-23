import Phaser from 'phaser';
import ReadingState from '../state.js';
import { DEPTHS, FONTS } from '../ui/constants.js';
import { ICON_KEYS } from '../ui/icons.js';
import { drawParchmentPlate, makeParchmentButton } from '../ui/panels.js';

export default class CelebrationModal {
    constructor(scene) {
        this.scene = scene;
        this.celebrationUI = null;
        this._resizeHandler = null;
    }

    show(mapKey) {
        if (!ReadingState._continentCompletedFlags) {
            ReadingState._continentCompletedFlags = {};
        }
        ReadingState._continentCompletedFlags[mapKey] = true;

        this.destroy();

        const { width, height } = this.scene.scale;
        const s = Phaser.Math.Clamp(width / 1200, 0.8, 1.2);

        this.celebrationUI = this.scene.add.container(0, 0).setDepth(DEPTHS.CELEBRATION).setScrollFactor(0);

        this.celebrationUI.once('destroy', () => {
            if (this._resizeHandler) {
                this.scene.scale.off('resize', this._resizeHandler, this.scene);
                this._resizeHandler = null;
            }
            this.celebrationUI = null;
        });

        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x0a192f, 0.85)
            .setOrigin(0).setInteractive().setScrollFactor(0);
        this.celebrationUI.add(overlay);

        const boxW = Math.min(width * 0.85, 500 * s);
        const boxH = 300 * s;

        // Everything below lives in one container so the entry tween can scale
        // the whole panel at once.
        const panel = this.scene.add.container(width / 2, height / 2).setScrollFactor(0);
        this.celebrationUI.add(panel);

        const plate = this.scene.add.graphics();
        drawParchmentPlate(plate, -boxW / 2, -boxH / 2, boxW, boxH, 12 * s, { s });
        panel.add(plate);

        const titleMsg = this.scene.add.text(10 * s, -60 * s, 'ONNITTELUT!', {
            fontSize: `${32 * s}px`,
            color: '#9e7a2a',
            fontFamily: FONTS.HEADING,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        panel.add(titleMsg);

        const partyIcon = this.scene.add.image(
            titleMsg.x - titleMsg.width / 2 - 26 * s, -60 * s, ICON_KEYS.PARTY
        ).setDisplaySize(36 * s, 36 * s);
        panel.add(partyIcon);

        const subMsg = this.scene.add.text(0, 15 * s,
            'Olet suorittanut tutkimusmatkan loppuun ja ansainnut palkinnon!', {
                fontSize: `${20 * s}px`,
                color: '#1e3a5f',
                fontFamily: FONTS.BODY,
                align: 'center',
                wordWrap: { width: boxW - 60 * s }
            }).setOrigin(0.5);
        panel.add(subMsg);

        const okBtn = makeParchmentButton(this.scene, 0, 90 * s, 'SELVÄ', {
            s, fontSize: 22, minWidth: 180 * s, onClick: () => this.destroy()
        });
        panel.add(okBtn.container);

        this._resizeHandler = () => { if (this.celebrationUI) this.show(mapKey); };
        this.scene.scale.on('resize', this._resizeHandler, this.scene);

        // Entry animation
        panel.setScale(0.5);
        this.scene.tweens.add({
            targets: panel,
            scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut'
        });

        // Add completion reward to backend (fire-and-forget)
        const userId = this.scene.game.registry.get('userId');
        ReadingState.addCompletionReward(userId, 'minigame', mapKey);
    }

    destroy() {
        if (this._resizeHandler) {
            this.scene.scale.off('resize', this._resizeHandler, this.scene);
            this._resizeHandler = null;
        }
        if (this.celebrationUI) {
            this.celebrationUI.destroy(true);
            this.celebrationUI = null;
        }
    }
}
