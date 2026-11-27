import Phaser from 'phaser';
import PathRenderer from '../managers/PathRenderer.js';
import TokenManager from '../managers/TokenManager.js';
import WaypointRenderer, { STAMP_MS, videoStopRadius } from '../managers/WaypointRenderer.js';
import CelebrationModal from '../modals/CelebrationModal.js';
import VideoPopupModal from '../modals/VideoPopupModal.js';
import ReadingState from '../state.js';
import { itemForMap } from '../data/items.js';
import { sceneForMap } from '../data/puzzleScenes.js';
import { DEPTHS, FONTS, INK, px, uiScale as calcUiScale, renderScale } from '../ui/constants.js';
import { ICON_KEYS } from '../ui/icons.js';
import { makeInkBadge } from '../ui/panels.js';
import { createDeskBackdrop } from '../ui/desk.js';
import { MapPanner, sheetRect } from '../ui/mapView.js';
import { BAG_PEEK, wideMapLayout } from '../ui/mapLayout.js';
import { goToScene } from '../ui/sceneChange.js';

// A book node is full size once it is this wide in CSS pixels, a finger's
// width. WaypointRenderer draws it at 56 logical units across.
const NODE_TOUCH_SIZE = 44;
const NODE_LOGICAL_SIZE = 56;
// With the backpack beside the sheet (a wide screen, so a mouse), a node may
// be this small: a continent sheet is wide, and the bag takes the room it
// would otherwise fill.
const NODE_POINTER_SIZE = 36;

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
        // Set between a redraw and the walk that follows it (walkSoon).
        this.walkPending = false;
        // The node just finished, whose tick the next redraw presses on.
        this.stampNodeIndex = null;

        // On bends between the book nodes, so a video never sits on top of one.
        this.videoCheckpoints = {
            5: {
                title: "Lukuvinkki: Visualisointi",
                url: "https://www.youtube.com/watch?v=TZoNz-2rk8c"
            },
            9: {
                title: "Lukuvinkki: Aktiivinen lukeminen",
                url: "https://www.youtube.com/watch?v=jDZcdgDgM48"
            }
        };

        this.viewedVideos = new Set();
    }

    create() {
        // Managers
        this.waypointRenderer = new WaypointRenderer(this);
        this.pathRenderer = new PathRenderer(this);
        this.tokenManager = new TokenManager();
        this.videoPopupModal = new VideoPopupModal(this);
        this.celebrationModal = new CelebrationModal(this);

        // Background: the continent sheet lies on the same wooden desk as the
        // world map, fitted whole rather than cropped.
        this.deskBackdrop = createDeskBackdrop(this);
        this.bg = this.add.image(0, 0, this.assetKey).setOrigin(0);
        this.panner = new MapPanner(this);

        // The title is built in handleResize(); the way back and the book are
        // on the backpack (components/hud/MapHud.jsx, handed over by pushHud()).

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
            // Reload the continent background texture.
            if (this.bg) this.bg.destroy();
            this.bg = this.add.image(0, 0, this.assetKey).setOrigin(0);
            this.walkSoon(100);
        });

        // Init layout
        this.isReady = true;
        this.handleResize();

        this.scale.on('resize', this.handleResize, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            this.waypointRenderer.destroy();
            this.pathRenderer.clear();
            this.videoPopupModal.destroy();
            this.celebrationModal.destroy();
            if (window.setMapHud) window.setMapHud(null);

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

        // The same layout as the world map (mapLayout.js): on a wide screen
        // the sheet stands at the left edge with the backpack beside it.
        // Anywhere else the sheet is zoomed until the book nodes are full size,
        // and the pupil drags it (mapView.js), in the room above the backpack
        // peeking in at the bottom edge; the world reaches down past the bag,
        // so a dragged map can always bring its bottom out from behind it.
        const r = renderScale();
        const sheetWidthFor = (nodeCss) => (this.LOGICAL_WIDTH * px(nodeCss)) / NODE_LOGICAL_SIZE;
        const wide = wideMapLayout(width, height, this.bg.width, this.bg.height,
            sheetWidthFor(NODE_POINTER_SIZE) / this.bg.width, r);
        let rect;
        if (wide) {
            rect = { ...wide.map, worldW: width, worldH: height };
        } else {
            const peek = BAG_PEEK * r;
            const above = sheetRect(width, height - peek, this.bg.width, this.bg.height,
                sheetWidthFor(NODE_TOUCH_SIZE) / this.bg.width, { coverSlivers: true });
            rect = { ...above, worldH: above.worldH + peek };
        }
        this.bg.setScale(rect.scale).setPosition(rect.x, rect.y);
        this.mapWorld = { width: rect.worldW, height: rect.worldH };
        this.panner.setWorld(rect);
        this.deskBackdrop.layout(width, height, rect, wide ? { clearFrom: rect.x + rect.width } : {});
        // Badges on the map centre on the sheet, and keep clear of the bag's top.
        const sheetMidX = wide ? rect.x + rect.width / 2 : width / 2;
        // Where the canvas popups centre and how wide they may grow (VideoPopupModal, CelebrationModal).
        this.popupArea = { x: sheetMidX, width: wide ? rect.width : width };
        const bottomClear = wide ? 0 : BAG_PEEK * r;
        this.hudPanel = wide ? {
            x: wide.panel.x / r, y: wide.panel.y / r,
            width: wide.panel.width / r, height: wide.panel.height / r
        } : null;
        this.pushHud();

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
        this.nodeWaypoints = nodeWaypointIndices(this.pointPositions.length);
        this.waypointRenderer.render(
            this.pointPositions, this.baseScale, this.videoCheckpoints,
            (videoData, index) => {
                if (this.tokenManager.lastPointIndex >= index) {
                    this.showVideoPopup(videoData, index, true);
                }
            },
            {
                nodeWaypoints: this.nodeWaypoints,
                nodes: ReadingState.nodesFor(this.scene.key),
                currentNodeIndex: ReadingState.currentNodeIndex(this.scene.key),
                onNodeClick: (nodeIndex) => this.openNode(nodeIndex),
                stampNodeIndex: this.stampNodeIndex
            }
        );
        // The stamp plays once; a later redraw (a resize) shows the node at rest.
        this.stampNodeIndex = null;

        // --- UI: ink badges, same family as the world map ---
        // Both are CSS pixel figures, so they go through the pixel ratio.
        const isNarrow = width / r < 600;
        const margin = (isNarrow ? 12 : 20) * r;

        if (this.titleBadge) this.titleBadge.destroy();

        if (this.titleLettering) { this.titleLettering.destroy(); this.titleLettering = null; }

        const mapKey = this.scene.key;

        // Title. On a phone it is lettering with no plate: outlined, so it
        // reads on the desk and on the map alike, and with no edge to sit
        // astride where the two meet. A wider screen gives it a paper plate,
        // centred on the sheet.
        let titleY = margin;
        let titleHeight;
        if (isNarrow) {
            this.titleLettering = this.add.text(width / 2, titleY, this.title, {
                fontFamily: FONTS.BODY,
                fontSize: `${Math.round(px(19))}px`,
                fontStyle: '900',
                color: INK.PAPER,
                align: 'center',
                stroke: INK.OUTLINE,
                strokeThickness: Math.round(px(5))
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTHS.UI);
            // The longest title must not reach the screen's edges.
            const room = width - margin * 2;
            if (this.titleLettering.width > room) {
                this.titleLettering.setScale(room / this.titleLettering.width);
            }
            titleHeight = this.titleLettering.displayHeight;
            this.titleBadge = null;
        } else {
            const title = makeInkBadge(this, sheetMidX, titleY, this.title, {
                s: uiS, anchor: 'center', fontSize: 24, depth: DEPTHS.UI
            });
            this.titleBadge = title.container.setScrollFactor(0, 0, true);
            titleHeight = title.height;
        }

        this.renderPuzzleMarker(sheetMidX, height - bottomClear, uiS, margin);

        // A continent the teacher sent back says so, under the title, and the
        // notice is the way back to the questions.
        if (this.redoNotice) { this.redoNotice.destroy(); this.redoNotice = null; }
        if (ReadingState.isLevelPendingResubmission(mapKey)) {
            const noticeY = titleY + titleHeight + 10;
            const notice = makeInkBadge(
                this, sheetMidX, noticeY,
                this.needsRedo()
                    ? 'OPETTAJA PYYTÄÄ VASTAAMAAN UUDELLEEN — KLIKKAA TÄSTÄ'
                    : 'OPETTAJA PYYTÄÄ TEKEMÄÄN TÄMÄN MANTEREEN UUDELLEEN',
                {
                    s: uiS, anchor: 'center', fontSize: 14, depth: DEPTHS.UI,
                    onClick: this.needsRedo() ? () => this.showStoryQuiz() : null
                }
            );
            this.redoNotice = notice.container.setScrollFactor(0, 0, true);
        }

        // Token
        this.tokenManager.updateScale(this.baseScale);
        const curIdx = this.tokenManager.lastPointIndex;
        this.tokenManager.setPosition(this.pointPositions[curIdx].x, this.pointPositions[curIdx].y);
        // A walk about to start (walkSoon) would find the buddy already at its
        // goal if the redraw snapped it there, so it then stays where it stands.
        if (!this.walkPending) this.updateTokenPosition(false);

        // The view opens on the buddy, and finds it again after a rotation.
        const token = this.tokenManager.token;
        if (token) this.panner.centerOn(token.x, token.y);

        if (import.meta.env.DEV) this.reportStopsUnderBuddy();
    }

    /**
     * Development check on the route data: the stops are drawn above the buddy,
     * so a video stop where the buddy stands at a book node would sit on its
     * face. Move that bend in continentRegistry.js.
     */
    reportStopsUnderBuddy() {
        const token = this.tokenManager.token;
        if (!token) return;
        const halfW = token.displayWidth / 2;
        const halfH = token.displayHeight / 2;
        const r = videoStopRadius(this.baseScale);
        this.nodeWaypoints.forEach((nodeIndex, i) => {
            const node = this.pointPositions[nodeIndex];
            const centreY = node.y - this.tokenManager.nodeOffsetY;
            Object.keys(this.videoCheckpoints).forEach((key) => {
                const stop = this.pointPositions[Number(key)];
                if (!stop) return;
                if (Math.abs(stop.x - node.x) < halfW + r && Math.abs(stop.y - centreY) < halfH + r) {
                    console.error(`${this.scene.key}: video stop ${key} is under the buddy at book node ${i + 1}`);
                }
            });
        });
    }

    /**
     * The badge that opens this continent's puzzle scene. Only four continents
     * hold one, and it appears once every book there has been read.
     *
     * Continents may be played in any order, so the item the scene needs may
     * well not be in the backpack yet. That is not a wall: the badge is dimmed,
     * the scene still opens, and the pupil reads the story and goes looking.
     */
    /** The puzzle badge, centred on `x` and standing `margin` above `bottom`. */
    renderPuzzleMarker(x, bottom, uiS, margin) {
        if (this.puzzleMarker) { this.puzzleMarker.destroy(); this.puzzleMarker = null; }

        const mapKey = this.scene.key;
        const scene = sceneForMap(mapKey);
        if (!scene) return;
        if (ReadingState.continentProgress(mapKey) < 100) return;

        const isSolved = ReadingState.isSceneSolved(mapKey);
        const hasItem = ReadingState.hasItem(scene.correctItem);
        const label = isSolved ? `${scene.title.toUpperCase()} — RATKAISTU` : scene.title.toUpperCase();

        const badge = makeInkBadge(this, x, 0, label, {
            iconKey: isSolved ? ICON_KEYS.CHECK : ICON_KEYS.LIGHTBULB,
            s: uiS, anchor: 'center', fontSize: 18, depth: DEPTHS.UI,
            onClick: () => this.openPuzzleScene()
        });
        badge.container.y = bottom - margin - badge.height;
        // Dimmed until the tool is found; still readable, still openable.
        badge.container.setAlpha(isSolved || hasItem ? 1 : 0.62);
        this.puzzleMarker = badge.container.setScrollFactor(0, 0, true);
    }

    openPuzzleScene() {
        if (window.openPuzzleScene) window.openPuzzleScene(this.scene.key);
    }

    /**
     * Half the continents hand over a tool once the pupil is halfway through
     * their books. It is granted once and never taken away.
     */
    async checkItemDrop() {
        const mapKey = this.scene.key;
        const item = itemForMap(mapKey);
        if (!item) return;
        if (ReadingState.hasItem(item.id)) return;
        if (ReadingState.continentProgress(mapKey) < 50) return;

        const userId = this.game.registry.get('userId');
        const granted = await ReadingState.grantItem(userId, item.id);
        if (granted && window.showItemFound) window.showItemFound(item.id);
    }

    /**
     * Hand the backpack (components/hud/MapHud.jsx) what it shows on this
     * continent: the tag back to the world map and the book button, ticked
     * once every book here is read. Called on every layout, which every
     * change to the reading here goes through.
     */
    /** A canvas popup is open (or closed): shade the backpack as the popup shades the map. */
    shadeHud(on) {
        if (!!this.hudShade === on) return;
        this.hudShade = on;
        if (this.sys.isActive()) this.pushHud();
    }

    pushHud() {
        if (!window.setMapHud) return;
        const mapKey = this.scene.key;
        window.setMapHud({
            panel: this.hudPanel,
            shade: !!this.hudShade,
            here: mapKey,
            tag: {
                label: 'Takaisin',
                onPress: () => {
                    if (this.mapBgm) this.mapBgm.stop();
                    goToScene(this, 'WorldMap');
                }
            },
            action: {
                label: 'Avaa kirja',
                onPress: () => this._handleBookBtnClick(),
                done: ReadingState._continentCompletedFlags?.[mapKey] === true
            }
        });
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

        const wasDone = (ReadingState.nodeAt(this.scene.key, nodeIndex)?.progress ?? 0) >= 100;
        ReadingState.saveNodeProgress(this.scene.key, nodeIndex, pct);
        const isStamped = !wasDone && pct >= 100;
        if (isStamped) this.stampNodeIndex = nodeIndex;

        if (ReadingState.isLevelPendingResubmission(this.scene.key)
            && ReadingState.continentProgress(this.scene.key) >= 100) {
            ReadingState.levelsCompletedResubmission[this.scene.key] = true;
        }

        // Redraw the route so the node shows its new state, then walk on.
        // Manual scene resume, since scene was never paused
        // Pausing the scene caused the handleResize to not work,
        // if portrait/landscape mode on mobile was changed while the UpdateProgressPopup was open
        this.walkSoon(100 + (isStamped ? STAMP_MS : 0));
    }

    // Redraws the map now and walks the buddy to where its progress puts it after `delay` ms.
    walkSoon(delay) {
        this.walkPending = true;
        this.handleResize();
        this.time.delayedCall(delay, () => {
            this.walkPending = false;
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
        this.pathRenderer.draw(this.pointPositions, targetIndex, this.baseScale);

        if (shouldAnimate) {
            const currentIndex = this.tokenManager.lastPointIndex;
            // The camera walks with the buddy, so it never leaves the screen.
            if (currentIndex !== targetIndex) this.panner.follow(this.tokenManager.token);
            this.tokenManager.animateAlongPath(
                this, this.pointPositions, currentIndex, targetIndex, mapKey,
                (finalIdx) => {
                    this.panner.unfollow();
                    this.checkCheckpointEvents(finalIdx);
                }
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

        this.checkItemDrop();

        if (ReadingState.continentProgress(this.scene.key) >= 100) {
            if (!ReadingState._continentCompletedFlags) {
                ReadingState._continentCompletedFlags = {};
            }
            const mapKey = this.scene.key;
            if (!ReadingState._continentCompletedFlags[mapKey]
                && !this.isDoingQuiz
                && !!ReadingState.isLevelPendingResubmission(mapKey) === !!ReadingState.levelsCompletedResubmission[mapKey]) {
                this.showStoryQuiz();
            }
        }
    }
}

export default BaseMapScene;
