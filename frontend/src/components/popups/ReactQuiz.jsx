import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import ReadingState from '../../game/state.js';
import InkFilter from '../ink/InkFilter.jsx';
import './ReactQuiz.css';

export default function ReactQuiz({ mapKey, onClose }) {
    const { user } = useAuth()
    const [error, setError] = useState('')
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState(() => {
        if (ReadingState?.quizAnswers?.[mapKey]) {
            return [...ReadingState.quizAnswers[mapKey]];
        }
        return ["", "", ""];
    });

    const isResubmittable = ReadingState.isLevelPendingResubmission(mapKey)
    const isReadOnly = !!(!isResubmittable && ReadingState?.quizAnswers && ReadingState.quizAnswers[mapKey]);
    const shouldReward = !isResubmittable && !isReadOnly;

    const questions = [
        "Miten kirja päättyi?",
        "Mistä kohdasta kirjassa pidit eniten?",
        "Miten kirja voisi jatkua?"
    ];

    const handleNext = async () => {
        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            if (!isReadOnly) {
                // Submit quiz answers to backend and wait for result
                const quizError = await ReadingState.submitQuizAnswers(mapKey, questions, answers);
                if (quizError) {
                    // Assumes the error is caused by answers that are too short
                    setError('Vastauksien lähettäminen epäonnistui. Tarkistathan että vastaukset ovat vähintään 3 merkkiä pitkiä.');
                    setStep(0);
                    return;
                }

                // Makes quiz readonly only after quiz has been successfully submitted
                if (!ReadingState.quizAnswers) ReadingState.quizAnswers = {};
                ReadingState.quizAnswers[mapKey] = answers;

                // After successful submission, mark the level complete (this will also unlock the next map)
                try {
                    ReadingState.saveLevelComplete(mapKey, user?.id);
                } catch (err) {
                    console.warn('Failed to mark level complete locally:', err);
                }

                // clear pending resubmission flag after re-submit
                if (isResubmittable && ReadingState.levelsPendingResubmission[mapKey]) {
                    ReadingState.levelsPendingResubmission[mapKey].pending = false;
                } else if (isResubmittable) {
                    ReadingState.levelsPendingResubmission[mapKey] = { pending: false, book: ReadingState.mapSelectedBook?.[mapKey] };
                }
            }
            onClose(mapKey, shouldReward);
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const bookTitle = useMemo(() => {
        const bookId = ReadingState.mapSelectedBook?.[mapKey];
        const progressEntry = ReadingState.progressEntriesByMapKey?.[mapKey];
        const titleFromBookList = ReadingState.globalBooks?.find(b => String(b.id) === String(bookId))?.title;
        return titleFromBookList || progressEntry?.book_title || '';
    }, [mapKey]);

    if (!mapKey) return null;

    return (
        <div
            className="rq-overlay"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <InkFilter />
            <div className="rq-box ink-shape ink-drop" onClick={(e) => e.stopPropagation()}>
                {bookTitle && <p className="rq-book">{bookTitle}</p>}
                <h2 className="rq-title">{isReadOnly ? "OMAT VASTAUKSET" : "TARINAKYSELY"}</h2>

                <p className="rq-question">{questions[step]}</p>

                <div className={`rq-answer-box ink-box ink-shape ink-shape--thin${isReadOnly ? ' rq-answer-box--read-only' : ''}`}>
                    <textarea
                        autoFocus
                        readOnly={isReadOnly}
                        value={answers[step]}
                        onChange={(e) => {
                            const newAns = [...answers];
                            newAns[step] = e.target.value;
                            setAnswers(newAns);
                        }}
                        placeholder="Kirjoita vastauksesi tähän..."
                        className="rq-answer"
                    />
                </div>

                <div className="rq-footer">
                    <div className="rq-buttons">
                        {step > 0 && (
                            <button onClick={handlePrev} className="rq-button rq-button--prev ink-shape ink-shape--thin ink-drop">
                                EDELLINEN
                            </button>
                        )}

                        <button onClick={handleNext} className="rq-button rq-button--next ink-shape ink-shape--thin ink-drop">
                            {step === questions.length - 1 ? (isReadOnly ? "SULJE" : "LÄHETÄ") : "SEURAAVA"}
                        </button>
                    </div>
                    <span className="rq-step">Vaihe {step + 1} / 3</span>
                </div>
                {error && <p className="section-error">{error}</p>}
            </div>
        </div>
    );
}
