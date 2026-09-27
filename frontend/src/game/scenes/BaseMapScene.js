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

// A continent is a route of this many nodes, one book each. Mirrors
// NODES_PER_CONTINENT in backend/utils/diplomaConfig.js.
const NODE_COUNT = 4;

/**
 * Which of the continent's authored waypoints are book nodes. The rest stay as
 * bends in the path, so the route keeps the shape it was drawn with.
 */
const nodeWaypointIndices = (pointCount) => {
    if (pointCount <= NODE_COUNT) {
        return Array.from({ length: pointCount }, (_, i) => i);
    }
    return Array.from(
        { length: NODE_COUNT },
        (_, i) => Math.round((i * (pointCount - 1)) / (NODE_COUNT - 1))
    );
};

class BaseMapScene extends Phaser.Scene {

    constructor(key, assetKey, title) {
        super(key);
        this.assetKey = assetKey;
        this.title = title;
        this.LOGICAL_WIDTH = 1280;

        this.isDoingQuiz = false;

        // On bends between the book nodes, so a video never sits on top of one.
        this.videoCheckpoints = {
            5: {
                title: "Lukuvinkki: Visualisointi",
                url: "https://www.youtube.com/watch?v=qw3S-S708tE"
            },
            9: {
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

        // Render waypoints. The book nodes are the ones the pupil acts on; the
        // other points are bends in the route.
        const currentIdx = this.tokenManager.lastPointIndex;
        this.nodeWaypoints = nodeWaypointIndices(this.pointPositions.length);
        this.waypointRenderer.render(
            this.pointPositions, this.baseScale, currentIdx,
            this.themeColor, this.videoCheckpoints,
            (videoData, index) => {
                if (this.tokenManager.lastPointIndex >= index) {
                    this.showVideoPopup(videoData, index, true);
                }
            },
            {
                nodeWaypoints: this.nodeWaypoints,
                nodes: ReadingState.nodesFor(this.scene.key),
                currentNodeIndex: ReadingState.currentNodeIndex(this.scene.key),
                onNodeClick: (nodeIndex) => this.openNode(nodeIndex)
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
            iconKey: ICON_KEYS.ARROW_LEFT, s: uiS, anchor: 'left', depth: DEPTHS.UI,
            onClick: () => {
                if (this.mapBgm) this.mapBgm.stop();
                this.scene.start('WorldMap');
            }
        });
        this.backIconContainer = back.container;

        // Book badge, with the done/loading icons stacked in the same slot
        const book = makeParchmentBadge(this, width - margin, margin, 'AVAA KIRJA', {
            iconKey: ICON_KEYS.BOOK, s: uiS, anchor: 'right', depth: DEPTHS.UI,
            onClick: () => this._handleBookBtnClick()
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

        // A continent the teacher sent back says so, under the title, and the
        // notice is the way back to the questions.
        if (this.redoNotice) { this.redoNotice.destroy(); this.redoNotice = null; }
        if (ReadingState.isLevelPendingResubmission(mapKey)) {
            const noticeY = titleY + this.titleBadge.getBounds().height + 10;
            const notice = makeParchmentBadge(
                this, width / 2, noticeY,
                this.needsRedo()
                    ? 'OPETTAJA PYYTÄÄ VASTAAMAAN UUDELLEEN — KLIKKAA TÄSTÄ'
                    : 'OPETTAJA PYYTÄÄ TEKEMÄÄN TÄMÄN MANTEREEN UUDELLEEN',
                {
                    s: uiS, anchor: 'center', fontSize: 14, depth: DEPTHS.UI,
                    onClick: this.needsRedo() ? () => this.showStoryQuiz() : null
                }
            );
            this.redoNotice = notice.container;
        }

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
        } else if (this.needsRedo()) {
            // Sent back by the teacher with every book already read: the only
            // thing left to do is answer the questions again, so go straight
            // there rather than into a book the pupil has finished.
            this.showStoryQuiz();
        } else {
            this.openNode(ReadingState.currentNodeIndex(mapKey));
        }
    }

    /**
     * The teacher sent this continent back and there is nothing left to read,
     * so the pupil is being asked to answer the questions again.
     */
    needsRedo() {
        const mapKey = this.scene.key;
        return ReadingState.isLevelPendingResubmission(mapKey)
            && ReadingState.continentProgress(mapKey) >= 100;
    }

    /**
     * Open one node of the route. An empty node asks for a book; a node that
     * already has one goes straight to recording how far the pupil has got.
     */
    openNode(nodeIndex) {
        const mapKey = this.scene.key;
        const node = ReadingState.nodeAt(mapKey, nodeIndex);
        if (!node) return;

        this.activeNodeIndex = nodeIndex;

        if (!node.bookId) {
            this.showBookList(nodeIndex);
            return;
        }

        const book = ReadingState.globalBooks.find((b) => String(b.id) === String(node.bookId));
        if (!book) {
            // The book was deleted from under the pupil; let them pick again.
            this.showBookList(nodeIndex);
            return;
        }
        // A finished node is read-only: its book has been read.
        this.launchReading(ReadingState.mapConfig[mapKey], {
            ...book, readTitle: node.bookTitle
        }, node.progress >= 100, nodeIndex);
    }

    showBookList(nodeIndex = ReadingState.currentNodeIndex(this.scene.key)) {
        const mapKey = this.scene.key;

        const result = window.openReactBookList ? window.openReactBookList(mapKey, nodeIndex) : undefined;

        if (result === 'completed') {
            this.showStoryQuiz();
        }

        const onBookSelected = async (book) => {
            // Clean up handler immediately on selection
            this.events.off('book-selected', onBookSelected);

            if (!book) return;

            // readTitle is set when the catalogue row offered a choice and the
            // pupil said which book they actually read.
            await ReadingState.saveBookSelection(mapKey, nodeIndex, Number(book.id), book.readTitle);
            this.updateTokenPosition(true);
            this.handleResize();

            this.launchReading(ReadingState.mapConfig[mapKey], book, false, nodeIndex);
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

    launchReading(config, book, readOnly, nodeIndex = this.activeNodeIndex) {
        // Reading happens away from the screen: the pupil records how far they
        // have got in the manual progress popup.
        const node = ReadingState.nodeAt(this.scene.key, nodeIndex);
        window.openReactUpdateProgress(
            this.scene.key,
            book,
            node?.progress ?? 0,
            readOnly
        );

        this.events.once('book-closed', (newPct) => {
            if (readOnly) this.showBookList(nodeIndex);
            else this.handleManualProgressSave(newPct, config, book, readOnly, nodeIndex);
        });
    }

    handleManualProgressSave(pct, config, book, readOnly, nodeIndex = this.activeNodeIndex) {
        if (readOnly) return;

        ReadingState.saveNodeProgress(this.scene.key, nodeIndex, pct);

        if (ReadingState.isLevelPendingResubmission(this.scene.key)
            && ReadingState.continentProgress(this.scene.key) >= 100) {
            ReadingState.levelsCompletedResubmission[this.scene.key] = true;
        }

        // Redraw the route so the node shows its new state.
        this.handleResize();

        // Manual scene resume, since scene was never paused
        // Pausing the scene caused the handleResize to not work,
        // if portrait/landscape mode on mobile was changed while the UpdateProgressPopup was open
        this.time.delayedCall(100, () => {
            this.updateTokenPosition(true);
        });
    }

    updateTokenPosition(shouldAnimate = true) {
        const mapKey = this.scene.key;
        const nodes = ReadingState.nodesFor(mapKey);
        const waypoints = this.nodeWaypoints ?? nodeWaypointIndices(this.pointPositions.length);

        // The token stands on the node it is working through, and creeps toward
        // the next one as that book is read.
        let targetIndex = waypoints[0];
        for (const [i, node] of nodes.entries()) {
            const pct = Number(node.progress) || 0;
            const from = waypoints[Math.min(i, waypoints.length - 1)];
            const to = waypoints[Math.min(i + 1, waypoints.length - 1)];
            if (pct >= 100) {
                targetIndex = to;
                continue;
            }
            targetIndex = Math.round(from + ((to - from) * pct) / 100);
            break;
        }
        targetIndex = Phaser.Math.Clamp(targetIndex, 0, this.pointPositions.length - 1);

        // Draw path
        this.pathRenderer.draw(this.pathGraphics, this.pointPositions, targetIndex, this.themeColor);

        if (shouldAnimate) {
            const currentIndex = this.tokenManager.lastPointIndex;
            this.tokenManager.animateAlongPath(
                this, this.pointPositions, currentIndex, targetIndex, mapKey,
                (finalIdx) => this.checkCheckpointEvents(finalIdx)
            );
        } else {
            this.tokenManager.snapToPoint(this.pointPositions, targetIndex, mapKey);
            this.checkCheckpointEvents(targetIndex);
        }
    }

    checkCheckpointEvents(index) {
        if (this.videoCheckpoints[index]) {
            this.showVideoPopup(this.videoCheckpoints[index], index, false);
        }

        if (ReadingState.continentProgress(this.scene.key) >= 100) {
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
