// src/components/PhaserGame.jsx
import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import Phaser from 'phaser';
import createGameConfig from '../game/config.js';
import { renderScale } from '../game/ui/constants.js';
import { fundingStrip } from '../game/ui/fundingStrip.js';
import ReadingState from '../game/state.js';
import ReactQuiz from './popups/ReactQuiz';
import BookListPanel from './popups/BookListPanel';
import UpdateProgressPopup from './popups/UpdateProgressPopup'
import PuzzleScene from './puzzle/PuzzleScene'
import ItemFoundCard from './puzzle/ItemFoundCard'
import GameLoading from './GameLoading'
import FundingNotice from './FundingNotice'
import MapHud from './hud/MapHud'
import './PhaserGame.css'
import { sceneForMap } from '../game/data/puzzleScenes.js'
import items from '../game/data/items.js'

// Shows the loading sheet whenever a scene starts and hides it once the scene
// has loaded its pictures and run create(). A scene whose pictures are cached
// starts and creates in the same tick, so React never draws the sheet for it.
function watchSceneLoading(game, setLoading) {
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.scenes) {
      scene.sys.events.on(Phaser.Scenes.Events.START, () => setLoading(true));
      scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => setLoading(false));
    }
    // A scene that finished before these listeners were attached.
    if (game.scene.getScenes(true).length > 0) setLoading(false);
  });
}

export default function PhaserGame() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const liftRef = useRef(null);
  const stripRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quizInfo, setQuizInfo] = useState({ visible: false, mapKey: null });
  const [bookListInfo, setBookListInfo] = useState({ visible: false, mapKey: null, nodeIndex: 1 });
  const [puzzleInfo, setPuzzleInfo] = useState({ visible: false, mapKey: null });
  const [foundItemId, setFoundItemId] = useState(null);
  // Set by the map scenes while they run (MapHud.jsx says what it holds); null
  // while no map is on screen.
  const [mapHud, setMapHud] = useState(null);
  // True from the first render, so the backend load is covered too.
  const [loading, setLoading] = useState(true);
  const [updateProgressInfo, setUpdateProgressInfo] = useState({
    visible: false,
    mapKey: null,
    book: null,
    currentPct: null,
    readOnly: false
  });

  // The funders' strip lies under the game; a map dragged past its bottom edge
  // lifts the game to show it (game/ui/fundingStrip.js). The lift moves the
  // canvas, so Phaser re-reads where it is, or presses would land off target.
  useEffect(() => {
    const strip = stripRef.current;
    const lift = liftRef.current;
    if (!strip || !lift) return;
    const measure = () => { fundingStrip.height = strip.offsetHeight; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    fundingStrip.onReveal = (cssPx) => {
      lift.style.transform = cssPx ? `translateY(${-cssPx}px)` : '';
      gameRef.current?.scale.updateBounds();
    };
    return () => {
      ro.disconnect();
      fundingStrip.onReveal = null;
      fundingStrip.shown = 0;
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) return;

    const parentEl = containerRef.current;
    if (!parentEl) return;

    let isCancelled = false;

    const init = async () => {
      // Load progress from backend before Phaser starts
      await ReadingState.loadFromBackend();
      if (isCancelled) return;

      window.setMapHud = setMapHud;

      const initW = parentEl.clientWidth;
      const initH = parentEl.clientHeight;

      const config = createGameConfig(parentEl, initW, initH);
      const game = new Phaser.Game(config);
      watchSceneLoading(game, setLoading);

      // Pass userId for backend API calls in Phaser scenes
      game.registry.set('userId', user?.id);
      game.registry.set('buddyId', user?.avatar || 'buddy_1');

      // Every scene change goes through game/ui/sceneChange.js, which calls
      // this first: the loading sheet goes up and the backpack away, and the
      // scene starts once React has painted that, so the canvas is never seen
      // blank with the old backpack on it.
      game.beforeSceneChange = (start) => {
        flushSync(() => {
          setLoading(true);
          setMapHud(null);
        });
        requestAnimationFrame(() => requestAnimationFrame(start));
      };

      // Return navigation logic
      game.handleBackNavigation = () => {
        if (user?.role === 'teacher') navigate('/teacher/dashboard');
        else navigate('/student/dashboard');
      };

      // React wake-up logic for quiz overlay
      window.openReactQuiz = (mapKey) => {
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setQuizInfo({ visible: true, mapKey: mapKey });
      };

      // React wake-up logic for book list overlay
      // nodeIndex says which stop on the continent's route the book is for.
      window.openReactBookList = (mapKey, nodeIndex = 1) => {
        if (ReadingState._continentCompletedFlags?.[mapKey] === true) {
          return 'completed';
        }
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setBookListInfo({ visible: true, mapKey, nodeIndex });
        return;
      };

      // React wake-up logic for the puzzle scene on a continent that holds one
      window.openPuzzleScene = (mapKey) => {
        if (!sceneForMap(mapKey)) return;
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setPuzzleInfo({ visible: true, mapKey });
      };

      // React wake-up logic for the item drop, halfway through a continent
      window.showItemFound = (itemId) => {
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setFoundItemId(itemId);
      };

      // React wake-up logic for reading scene
      window.openReactUpdateProgress = (mapKey, book, currentPct, readOnly) => {
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setUpdateProgressInfo({
          visible: true,
          mapKey,
          book,
          currentPct,
          readOnly
        });
      };

      gameRef.current = game;

      const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          // contentRect is CSS pixels; the game runs at device pixels.
          const dpr = renderScale();
          game.scale.resize(Math.floor(width * dpr), Math.floor(height * dpr));
        }
      });
      ro.observe(parentEl);

      // Store for cleanup
      game._resizeObserver = ro;
    };

    init();

    return () => {
      isCancelled = true;
      window.openReactQuiz = null;
      window.openReactBookList = null;
      window.openPuzzleScene = null;
      window.showItemFound = null;
      window.setMapHud = null;
      if (gameRef.current) {
        if (gameRef.current._resizeObserver) {
          gameRef.current._resizeObserver.disconnect();
        }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [navigate, user]);

  return (
    <div className="game-shell">
      <div className="game-lift" ref={liftRef}>
      <div className="game-stage">
        <div id="game-container" ref={containerRef} />

        {mapHud && <MapHud {...mapHud} />}
      </div>

      <div ref={stripRef}>
        <FundingNotice strip />
      </div>
      </div>

      {loading && <GameLoading />}

      {quizInfo.visible && (
        <ReactQuiz
          mapKey={quizInfo.mapKey}
          onClose={(mapKey, shouldReward) => {
            setQuizInfo({ visible: false, mapKey: null });
            if (gameRef.current) {
              const scene = gameRef.current.scene.getScene(mapKey);
              if (shouldReward) scene.events.emit('give-level-complete-reward');
              scene.isDoingQuiz = false;
              
              if (gameRef.current.input) {
                gameRef.current.input.enabled = true;
              }
            }
          }}
        />
      )}

      {bookListInfo.visible && (
        <BookListPanel
          mapKey={bookListInfo.mapKey}
          nodeIndex={bookListInfo.nodeIndex}
          onClose={() => {
            setBookListInfo({ visible: false, mapKey: null, nodeIndex: 1 });
            if (gameRef.current.input) {
              gameRef.current.input.enabled = true;
            }
          }}
          onSelect={(mapKey, book) => {
            setBookListInfo({ visible: false, mapKey: null, nodeIndex: 1 });
            if (gameRef.current) {
              const scene = gameRef.current.scene.getScene(mapKey);
              scene.events.emit('book-selected', book);

              if (gameRef.current.input) {
                gameRef.current.input.enabled = true;
              }
            }
          }}
        />
      )}

      {puzzleInfo.visible && (
        <PuzzleScene
          scene={sceneForMap(puzzleInfo.mapKey)}
          inventory={items.filter((item) => ReadingState.hasItem(item.id))}
          alreadySolved={ReadingState.isSceneSolved(puzzleInfo.mapKey)}
          onSolved={(gameId) => ReadingState.grantSceneGame(user?.id, gameId)}
          onClose={() => {
            const mapKey = puzzleInfo.mapKey;
            setPuzzleInfo({ visible: false, mapKey: null });
            if (gameRef.current) {
              // Redraw the marker, which now says the scene is solved.
              gameRef.current.scene.getScene(mapKey)?.handleResize();
              if (gameRef.current.input) {
                gameRef.current.input.enabled = true;
              }
            }
          }}
          onGoToDashboard={() => navigate('/student/dashboard')}
        />
      )}

      {foundItemId && (
        <ItemFoundCard
          itemId={foundItemId}
          onClose={() => {
            setFoundItemId(null);
            if (gameRef.current?.input) {
              gameRef.current.input.enabled = true;
            }
          }}
        />
      )}

      {updateProgressInfo.visible && (
        <UpdateProgressPopup
          book={updateProgressInfo.book}
          currentPct={updateProgressInfo.currentPct}
          readOnly={updateProgressInfo.readOnly}
          onClose={(newPct) => {
            const mapKey = updateProgressInfo.mapKey;
            setUpdateProgressInfo({
              visible: false,
              mapKey: null,
              book: null,
              currentPct: null,
              readOnly: false
            });
            if (gameRef.current) {
              const scene = gameRef.current.scene.getScene(mapKey);
              scene.events.emit('book-closed', newPct);

              if (gameRef.current.input) {
                gameRef.current.input.enabled = true;
              }
            }
          }}
        />
      )}
    </div>
  );
}
