import { DEPTHS, CSS_COLORS, FONTS, uiScale } from '../ui/constants.js';
import { ICON_KEYS, INLINE_ICONS, iconImage } from '../ui/icons.js';
import { makeInkButton, makeInkPanel } from '../ui/panels.js';

export default class VideoPopupModal {
    constructor(scene) {
        this.scene = scene;
        this.popupUI = null;
        this._resizeHandler = null;
        this._escHandler = null;
    }

    show(videoData, index, isManual, viewedVideos) {
        if (!isManual && viewedVideos.has(index)) return;

        this.destroy();

        const { width, height } = this.scene.scale;
        const s = uiScale(width);
        const depthBase = DEPTHS.VIDEO;

        this.popupUI = this.scene.add.group();

        // Overlay
        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x3a2a10, 0.4)
            .setOrigin(0).setScrollFactor(0).setDepth(depthBase).setInteractive();
        this.popupUI.add(overlay);

        // Box
        const boxW = 450 * s;
        const boxH = 300 * s;

        const plate = makeInkPanel(this.scene, width / 2 - boxW / 2, height / 2 - boxH / 2, boxW, boxH, s)
            .setScrollFactor(0).setDepth(depthBase + 1);
        this.popupUI.add(plate);

        // Title with lightbulb icon
        const title = this.scene.add.text(width / 2 + (10 * s), height / 2 - (100 * s), 'LUKUVINKKI AVATTU', {
            fontFamily: FONTS.BODY,
            fontSize: (26 * s) + 'px',
            color: CSS_COLORS.NAVY,
            fontStyle: '800'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depthBase + 2);
        this.popupUI.add(title);

        const bulbIcon = iconImage(
            this.scene, title.x - title.width / 2 - (24 * s), height / 2 - (100 * s), ICON_KEYS.LIGHTBULB, 30 * s
        ).setScrollFactor(0).setDepth(depthBase + 2);
        this.popupUI.add(bulbIcon);

        // Subtitle
        const subTitle = this.scene.add.text(width / 2, height / 2 - (40 * s), videoData.title, {
            fontFamily: FONTS.BODY,
            fontSize: (18 * s) + 'px',
            color: CSS_COLORS.INK,
            fontStyle: '700',
            align: 'center',
            wordWrap: { width: boxW - 60 * s }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depthBase + 2);
        this.popupUI.add(subTitle);

        // Watch button
        const watchBtn = makeInkButton(this.scene, width / 2, height / 2 + (50 * s), 'KATSO TÄSSÄ', {
            s, fontSize: 20, minWidth: 260 * s, depth: depthBase + 2
        });
        this.popupUI.add(watchBtn.container);

        // Close button
        const closeBtn = this.scene.add.text(width / 2, height / 2 + (120 * s), '[ Sulje ]', {
            fontFamily: FONTS.BODY,
            fontSize: (18 * s) + 'px',
            color: CSS_COLORS.NAVY,
            fontStyle: '800',
            padding: 10
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depthBase + 2)
            .setInteractive({ useHandCursor: true });
        this.popupUI.add(closeBtn);

        const cleanup = () => {
            viewedVideos.add(index);
            this.destroy();
        };

        watchBtn.container.on('pointerup', () => {
            // Each checkpoint plays the video in its own data entry.
            const targetVideoId = new URL(videoData.url).searchParams.get('v');

            const embedUrl = `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&rel=0&modestbranding=1`;

            const videoOverlay = document.createElement('div');
            videoOverlay.id = 'video-dom-layer';
            videoOverlay.style = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); z-index: 20000000;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 10px; box-sizing: border-box;
            `;
            videoOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; width: min(92vw, 160vh); max-width: 1000px;">
                    <button id="close-dom-video" style="
                        background: #e9b949; color: #3a2a10;
                        border: 3px solid #3a2a10; padding: 10px 25px;
                        margin-bottom: 8px;
                        font-weight: bold; cursor: pointer;
                        border-radius: 12px; font-size: 16px;
                        font-family: Nunito, sans-serif;
                    ">${INLINE_ICONS.CROSS} SULJE </button>
                    <div style="
                        width: 100%;
                        aspect-ratio: 16/9;
                        max-height: 70vh;
                        border: 5px solid #3a2a10;
                        background: #000;
                    ">
                        <iframe width="100%" height="100%" src="${embedUrl}"
                                frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `;
            document.body.append(videoOverlay);
            document.getElementById('close-dom-video').onclick = () => {
                const el = document.getElementById('video-dom-layer');
                if (el) el.remove();
            };
            cleanup();
        });

        closeBtn.on('pointerdown', () => cleanup());

        // ESC handler
        this._escHandler = (e) => {
            if (e.key === 'Escape') {
                const domLayer = document.getElementById('video-dom-layer');
                if (domLayer) domLayer.remove();
                cleanup();
            }
        };
        window.addEventListener('keydown', this._escHandler);

        // Auto-resize
        this._resizeHandler = () => {
            if (this.popupUI) this.show(videoData, index, true, viewedVideos);
        };
        this.scene.scale.on('resize', this._resizeHandler);
    }

    destroy() {
        if (this._resizeHandler) {
            this.scene.scale.off('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._escHandler) {
            window.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        if (this.popupUI) {
            this.popupUI.destroy(true);
            this.popupUI = null;
        }
    }
}
