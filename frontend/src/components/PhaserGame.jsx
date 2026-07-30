// src/components/PhaserGame.jsx
import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Phaser from 'phaser';
import createGameConfig from '../game/config.js';
import ReadingState from '../game/state.js';
import ReactQuiz from './ReactQuiz';
import BookListPanel from './BookListPanel';
import UpdateProgressPopup from './popups/UpdateProgressPopup'

export default function PhaserGame() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quizInfo, setQuizInfo] = useState({ visible: false, mapKey: null });
  const [bookListInfo, setBookListInfo] = useState({ visible: false, mapKey: null });
  const [updateProgressInfo, setUpdateProgressInfo] = useState({
    visible: false,
    mapKey: null,
    book: null,
    currentPct: null,
    readOnly: false
  });

  useEffect(() => {
    if (gameRef.current) return;

    const parentEl = containerRef.current;
    if (!parentEl) return;

    let isCancelled = false;

    const init = async () => {
      // Load progress from backend before Phaser starts
      await ReadingState.loadFromBackend();
      if (isCancelled) return;

      const initW = parentEl.clientWidth;
      const initH = parentEl.clientHeight;

      const config = createGameConfig(parentEl, initW, initH);
      const game = new Phaser.Game(config);

      // Pass userId for backend API calls in Phaser scenes
      game.registry.set('userId', user?.id);
      game.registry.set('buddyId', user?.avatar || 'buddy_1');

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
      window.openReactBookList = (mapKey) => {
        if (ReadingState._continentCompletedFlags?.[mapKey] === true) {
          return 'completed';
        }
        if (gameRef.current?.input) {
          gameRef.current.input.enabled = false;
        }
        setBookListInfo({ visible: true, mapKey });
        return;
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
          game.scale.resize(Math.floor(width), Math.floor(height));
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
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
      <div
        id="game-container"
        ref={containerRef}
        style={{ width: '100%', height: '100%', backgroundColor: '#000', zIndex: 1 }}
      />

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
          onClose={() => {
            setBookListInfo({ visible: false, mapKey: null });
            if (gameRef.current.input) {
              gameRef.current.input.enabled = true;
            }
          }}
          onSelect={(mapKey, book) => {
            setBookListInfo({ visible: false, mapKey: null });
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
