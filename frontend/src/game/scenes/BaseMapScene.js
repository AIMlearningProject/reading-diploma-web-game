import Phaser from 'phaser';
import PathRenderer from '../managers/PathRenderer.js';
import TokenManager from '../managers/TokenManager.js';
import WaypointRenderer from '../managers/WaypointRenderer.js';
import CelebrationModal from '../modals/CelebrationModal.js';
import VideoPopupModal from '../modals/VideoPopupModal.js';
import ReadingState from '../state.js';
import { DEPTHS, uiScale as calcUiScale } from '../ui/constants.js';
import { ICON_KEYS } from '../ui/icons.js';
import { makeParchmentBadge } from '../ui/panels.js';
import { createDeskBackdrop, fitRect } from '../ui/desk.js';

class BaseMapScene extends Phaser.Scene {

    constructor(key, assetKey, title) {
        super(key);
        this.assetKey = assetKey;
        this.title = title;
        this.LOGICAL_WIDTH = 1280;

        this.isDoingQuiz = false;

        this.videoCheckpoints = {
            3: {
                title: "Lukuvinkki: Visualisointi",
                url: "https://www.youtube.com/watch?v=qw3S-S708tE"
            },
            7: {
                title: "Lukuvinkki: Aktiivinen lukeminen",
                url: "https://www.youtube.com/watch?v=XjMv7DUtW8o"
            }
        };

        this.viewedVideos = new Set();
    }

    create() {
        // Managers
        this.waypointRenderer = new WaypointRenderer(this);
        this.pathRenderer = new PathRenderer();
        this.tokenManager = new TokenManager();
        this.videoPopupModal = new VideoPopupModal(this);
        this.celebrationModal = new CelebrationModal(this);

        // Background: the continent sheet lies on the same wooden desk as the
        // world map, fitted whole rather than cropped.
        this.deskBackdrop = createDeskBackdrop(this);
        this.bg = this.add.image(0, 0, this.assetKey).setOrigin(0);

        // Path graphics layer
        this.pathGraphics = this.add.graphics();
        this.pathGraphics.setDepth(DEPTHS.PATH);

        // Title, back and book badges are all built in handleResize().

        // Token
        const savedIndex = ReadingState.tokenPositions?.[this.scene.key] ?? 0;
        this.tokenManager.create(this, savedIndex);

        // Audio context resume
        this.input.once('pointerdown', () => {
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        });

        // Scene resume listener
        this.events.on('resume', () => {
            this.time.delayedCall(100, () => {
                this.updateTokenPosition(true);
            });
            // Reload the continent background texture.
            if (this.bg) this.bg.destroy();
            this.bg = this.add.image(0, 0, this.assetKey).setOrigin(0);
            this.handleResize();
        });

        // Init layout
        this.isReady = true;
        this.handleResize();

        this.scale.on('resize', this.handleResize, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            this.waypointRenderer.destroy();
            this.videoPopupModal.destroy();
            this.celebrationModal.destroy();

            // Release the continent background texture after leaving the scene.
            try {
                if (this.assetKey && this.textures.exists(this.assetKey)) {
                    this.bg.destroy();
                    this.textures.remove(this.assetKey);
                }
            } catch (e) {
                console.warn('Failed to remove continent texture', this.assetKey, e);
            }
        });

        this.time.delayedCall(50, () => {
            this.updateTokenPosition(false);
        });
    }

    handleResize() {
        const { width, height } = this.scale;

        // The whole sheet is always on screen, so the camera never moves.
        const rect = fitRect(width, height, this.bg.width, this.bg.height);
        this.bg.setScale(rect.scale).setPosition(rect.x, rect.y);
        this.cameras.main.setBounds(0, 0, width, height).setScroll(0, 0);
        this.deskBackdrop.layout(width, height, rect);

        this.baseScale = rect.width / this.LOGICAL_WIDTH;
        const uiS = calcUiScale(width);

        // Waypoints are authored against a LOGICAL_WIDTH-wide sheet, so they
        // scale with it and shift with its offset on the desk.
        this.pointPositions = this.rawPoints.map(p => ({
            x: rect.x + p.x * this.baseScale,
            y: rect.y + p.y * this.baseScale
        }));

        // Render waypoints
        const currentIdx = this.tokenManager.lastPointIndex;
        this.waypointRenderer.render(
            this.pointPositions, this.baseScale, currentIdx,
            this.themeColor, this.videoCheckpoints,
            (videoData, index) => {
                if (this.tokenManager.lastPointIndex >= index) {
                    this.showVideoPopup(videoData, index, true);
                }
            }
        );

        // --- UI: parchment badges, same family as the world map ---
        const isNarrow = width < 600;
        const margin = isNarrow ? 12 : 20;

        if (this.backIconContainer) this.backIconContainer.destroy();
        if (this.bookIconContainer) this.bookIconContainer.destroy();
        if (this.titleBadge) this.titleBadge.destroy();

        // Back badge
        const back = makeParchmentBadge(this, margin, margin, 'TAKAISIN', {
            iconKey: ICON_KEYS.ARROW_LEFT, s: uiS, anchor: 'left', depth: DEPTHS.UI
        });
        this.backIconContainer = back.container;

        // Book badge, with the done/loading icons stacked in the same slot
        const book = makeParchmentBadge(this, width - margin, margin, 'AVAA KIRJA', {
            iconKey: ICON_KEYS.BOOK, s: uiS, anchor: 'right', depth: DEPTHS.UI
        });
        this.bookIconContainer = book.container;
        if (book.icon) book.icon.name = 'bookGraphic';

        const mapKey = this.scene.key;
        const isContinentCompleted = ReadingState._continentCompletedFlags?.[mapKey];

        const readBookImg = this.add.image(book.iconX, book.iconY, ICON_KEYS.CHECKMARK)
            .setDisplaySize(book.iconSize, book.iconSize)
            .setVisible(!!isContinentCompleted);
        readBookImg.name = 'readBookIcon';
        this.bookIconContainer.add(readBookImg);

        const loadingIcon = this.add.image(book.iconX, book.iconY, ICON_KEYS.HOURGLASS)
            .setDisplaySize(book.iconSize, book.iconSize)
            .setVisible(false);
        loadingIcon.name = 'loadingIcon';
        this.bookIconContainer.add(loadingIcon);

        // Title badge, tucked under the corner badges on narrow screens
        const titleY = isNarrow ? margin + back.height + 8 : margin;
        this.titleBadge = makeParchmentBadge(this, width / 2, titleY, this.title, {
            s: uiS, anchor: 'center', fontSize: 24, depth: DEPTHS.UI
        }).container;

        // Button interaction
        const setupBtn = (container, callback) => {
            container.setInteractive(
                new Phaser.Geom.Rectangle(0, 0, container.width, container.height),
                Phaser.Geom.Rectangle.Contains
            );
            container.input.cursor = 'pointer';
            container.on('pointerover', () => container.setScale(1.05));
            container.on('pointerdown', () => container.setScale(0.95));
            container.on('pointerup', () => { container.setScale(1); callback(); });
            container.on('pointerout', () => container.setScale(1));
        };

        setupBtn(this.bookIconContainer, () => this._handleBookBtnClick());
        setupBtn(this.backIconContainer, () => {
            if (this.mapBgm) this.mapBgm.stop();
            this.scene.start('WorldMap');
        });

        // Token
        this.tokenManager.updateScale(this.baseScale);
        const curIdx = this.tokenManager.lastPointIndex;
        this.tokenManager.setPosition(this.pointPositions[curIdx].x, this.pointPositions[curIdx].y);
        this.updateTokenPosition(false);
    }

    _handleBookBtnClick() {
        const mapKey = this.scene.key;
        if (ReadingState._continentCompletedFlags?.[mapKey] === true) {
            this.showStoryQuiz();
        } else {
            this.showBookList();
        }
    }

    showBookList() {
        const mapKey = this.scene.key;
        
        // Booklist using the BookListModal system.
        /*const result = this.bookListModal.show(mapKey, async (book, key, mapCfg, isCompleted) => {
            if (!isCompleted) {
                ReadingState.mapSelectedBook[mapKey] = book.id;
                await ReadingState.saveBookSelection(mapKey, Number(book.id));
            }
            const bookData = await BookFetcher.fetchAndLaunch(
                this, book, mapCfg, isCompleted, this.bookIconContainer
            );
            this.launchReading(mapCfg, bookData);
        });
        const isResubmittable = ReadingState.isLevelPendingResubmission(mapKey)
        if (result === 'completed' || isResubmittable) {
            this.showStoryQuiz();
        }*/
        // New booklist using the BooListPanel React component
        const result = window.openReactBookList ? window.openReactBookList(mapKey) : undefined;

        if (result === 'completed') {
            this.showStoryQuiz();
        }

        const onBookSelected = async (book) => {
            // Clean up handler immediately on selection
            this.events.off('book-selected', onBookSelected);

            if (!book) return;

            const mapCfg = ReadingState.mapConfig[mapKey];
            const isCompleted = !!(ReadingState.completedBookIds || {})[book.id];

            if (!isCompleted) {
                ReadingState.mapSelectedBook[mapKey] = book.id;
                await ReadingState.saveBookSelection(mapKey, Number(book.id));
            }

            this.launchReading(mapCfg, book, isCompleted);
        };

        // Use once so it auto-cleans up if user selects a book
        this.events.once('book-selected', onBookSelected);
    }

    showVideoPopup(videoData, index, isManual) {
        this.videoPopupModal.show(videoData, index, isManual, this.viewedVideos);
    }

    showStoryQuiz() {
        const mapKey = this.scene.key;
        this.isDoingQuiz = true;

        if (window.openReactQuiz) {
            window.openReactQuiz(mapKey);
        } else {
            console.error("Critical: window.openReactQuiz is undefined!");
        }

        this.events.once('give-level-complete-reward', this.showFinalCelebration.bind(this));
    }

    showFinalCelebration() {
        this.celebrationModal.show(this.scene.key);
    }

    launchReading(config, book, readOnly) {
        // API Reading scene using Phaser
        /*this.scene.pause();
        this.scene.launch('ReadingScene', {
            prevScene: this.scene.key,
            mapTitle: this.title,
            bookContent: bookData,
            bookId: bookData.id,
            readOnly: bookData.readOnly || false
        });*/

        // React reading scene with manual progress updating
        window.openReactUpdateProgress(
            this.scene.key,
            book,
            ReadingState.bookProgress[book.id] || 0,
            readOnly
        );

        this.events.once('book-closed', (newPct) => {
            if (readOnly) this.showBookList();
            else this.handleManualProgressSave(newPct, config, book, readOnly);
        });
    }

    handleManualProgressSave(pct, config, book, readOnly) {
        ReadingState.bookProgress[book.id] = pct;

        if (!readOnly && config.storage) {
            ReadingState[config.storage] = pct;
            ReadingState.saveCurrentProgress(this.scene.key, pct);

            if (ReadingState.isLevelPendingResubmission(this.scene.key) && pct >= 100) {
                ReadingState.levelsCompletedResubmission[this.scene.key] = true;
            }
        }

        // Manual scene resume, since scene was never paused
        // Pausing the scene caused the handleResize to not work,
        // if portrait/landscape mode on mobile was changed while the UpdateProgressPopup was open
        this.time.delayedCall(100, () => {
            this.updateTokenPosition(true);
        });
    }

    updateTokenPosition(shouldAnimate = true) {
        const config = ReadingState.mapConfig[this.scene.key];
        const storageKey = config ? config.storage : 'progress';

        const mapSelectedBook = ReadingState.mapSelectedBook || {};
        const currentBookId = mapSelectedBook[this.scene.key];

        let currentProg;
        currentProg = currentBookId ? ReadingState.bookProgress[currentBookId] || 0 : ReadingState[storageKey] || 0;

        let targetIndex = Math.floor((currentProg / 100) * (this.pointPositions.length - 1));
        targetIndex = Phaser.Math.Clamp(targetIndex, 0, this.pointPositions.length - 1);

        // Draw path
        this.pathRenderer.draw(this.pathGraphics, this.pointPositions, targetIndex, this.themeColor);

        if (shouldAnimate) {
            const currentIndex = this.tokenManager.lastPointIndex;
            this.tokenManager.animateAlongPath(
                this, this.pointPositions, currentIndex, targetIndex, this.scene.key,
                (finalIdx) => this.checkCheckpointEvents(finalIdx)
            );
        } else {
            this.tokenManager.snapToPoint(this.pointPositions, targetIndex, this.scene.key);
            this.checkCheckpointEvents(targetIndex);
        }
    }

    checkCheckpointEvents(index) {
        if (this.videoCheckpoints[index]) {
            this.showVideoPopup(this.videoCheckpoints[index], index, false);
        }

        if (index === this.pointPositions.length - 1) {
            if (!ReadingState._continentCompletedFlags) {
                ReadingState._continentCompletedFlags = {};
            }
            const mapKey = this.scene.key;
            if (!ReadingState._continentCompletedFlags[mapKey]
                && !this.isDoingQuiz
                && !!ReadingState.isLevelPendingResubmission(mapKey) === !!ReadingState.levelsCompletedResubmission[mapKey]) {
                const readBookG = this.bookIconContainer?.getByName('readBookIcon');
                readBookG.setVisible(true);
                this.showStoryQuiz();
            }
        }
    }
}

export default BaseMapScene;
