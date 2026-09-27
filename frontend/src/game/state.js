import {
    addReward,
    completeLevel,
    fetchDiplomaBooks,
    fetchMyBooks,
    fetchProgress,
    fetchSubmissions,
    reSubmitQuiz,
    setNodeBook,
    setNodeProgress,
    submitQuiz
} from '../services/api.js';

// A continent is a route of this many nodes, one book each; finishing them all
// completes the continent. Mirrors NODES_PER_CONTINENT in
// backend/utils/diplomaConfig.js.
const NODES_PER_CONTINENT = 4;

// Shown on a continent that has no group of its own for this grade: the pupil
// may pick any book from their year's list there. Finnish UI text, do not
// translate. Mirrors FREE_CHOICE_LABEL in build/diploma/mapping.py.
const FREE_CHOICE_LABEL = 'Vapaa valinta';

const ReadingState = {
    // Progress in each continent (driving token)
    europeProgress: 0,
    africaProgress: 0,
    antarcticaProgress: 0,
    arcticProgress: 0,
    asiaProgress: 0,
    northAmericaProgress: 0,
    southAmericaProgress: 0,
    oceaniaProgress: 0,

    // Reading progress for each book: bookId -> 0-100
    bookProgress: {},

    // Books that have been "completely read" (used to exclude from the book list)
    completedBookIds: {},
    mapFinished: {},

    // The book currently bound to each continent: mapKey -> bookId.
    // Kept in step with the node the pupil touched last.
    mapSelectedBook: {},

    // Each continent's route: mapKey -> [{ index, bookId, bookTitle, progress }].
    // One entry per node, always NODES_PER_CONTINENT long.
    mapNodes: {},

    // Books actually finished, and how many the whole diploma comes to:
    // one per node, across every continent.
    booksRead: 0,
    targetBooks: NODES_PER_CONTINENT * 8,

    // Tracks which levels need resubmission
    levelsPendingResubmission: {},

    /**
     * Tracks which levels that need resubmission have been completed
     * in order to know when a book has been read on a resubmittable level
     */
    levelsCompletedResubmission: {},

    // Progress id is needed for submitQuiz endpoints
    progressEntriesByMapKey: {},

    /**
     * A global list of 10 books (from your original main.js's globalBooks).
     */
    globalBooks: [],

    /**
     * Continent unlocking order: from north to south
     */
    mapOrder: [
        'ArcticMap',
        'EuropeMap',
        'AsiaMap',
        'NorthAmericaMap',
        'SouthAmericaMap',
        'AfricaMap',
        'OceaniaMap',
        'AntarcticaMap'
    ],
    /**
     * Per-continent client state. `storage` names the field on this object that
     * mirrors that continent's current_progress.
     */
    mapConfig: {
        'ArcticMap': { storage: 'arcticProgress' },
        'EuropeMap': { storage: 'europeProgress' },
        'AsiaMap': { storage: 'asiaProgress' },
        'NorthAmericaMap': { storage: 'northAmericaProgress' },
        'SouthAmericaMap': { storage: 'southAmericaProgress' },
        'AfricaMap': { storage: 'africaProgress' },
        'OceaniaMap': { storage: 'oceaniaProgress' },
        'AntarcticaMap': { storage: 'antarcticaProgress' },
    },

    /**
     * The pupil's diploma grade band ('1-2' ... '9'), from the backend.
     */
    gradeBand: null,

    /**
     * What each continent stands for in this pupil's year:
     * mapKey -> { categories: string[], label: string, free: boolean }.
     * A continent with no group of its own is `free` and offers the whole list.
     */
    continentGenres: {},


    /**
     * Return the mapKey of the first continent that is not finished yet. Every
     * continent is open from the start, so this is only a sensible default for
     * "where is the pupil now", not a gate.
     */
    getCurrentContinent() {
        for (const mapKey of this.mapOrder) {
            if (!this._continentCompletedFlags?.[mapKey]) return mapKey;
        }
        return this.mapOrder.at(-1);
    },

    /**
     * What this continent stands for in the pupil's year.
     */
    genreFor(mapKey) {
        return this.continentGenres[mapKey] ?? { categories: [], label: FREE_CHOICE_LABEL, free: true };
    },

    /**
     * The books a pupil may bind to this continent: the groups mapped to it,
     * or -- on a free-choice continent -- their whole year's list. Books the
     * class added themselves are always offered, on every continent.
     */
    booksForContinent(mapKey, nodeIndex) {
        const { categories, free } = this.genreFor(mapKey);
        // A book already taken by another node of this continent is out: the
        // route is meant to be several different books.
        const taken = new Set(
            this.nodesFor(mapKey)
                .filter((node) => node.bookId && node.index !== nodeIndex)
                .map((node) => String(node.bookId))
        );
        return this.globalBooks.filter((book) => {
            if (taken.has(String(book.id))) return false;
            if (book.source !== 'diploma') return true;
            return free || categories.includes(book.category);
        });
    },

    /**
     * This continent's route. Always NODES_PER_CONTINENT long, even before the
     * backend has answered.
     */
    nodesFor(mapKey) {
        const nodes = this.mapNodes[mapKey];
        if (nodes && nodes.length > 0) return nodes;
        return Array.from({ length: NODES_PER_CONTINENT }, (_, i) => ({
            index: i + 1, bookId: null, bookTitle: null, progress: 0
        }));
    },

    nodeAt(mapKey, nodeIndex) {
        return this.nodesFor(mapKey).find((node) => node.index === nodeIndex) ?? null;
    },

    /**
     * The node the pupil is on: the first one not finished, or the last if the
     * whole continent is done.
     */
    currentNodeIndex(mapKey) {
        const nodes = this.nodesFor(mapKey);
        const open = nodes.find((node) => node.progress < 100);
        return open ? open.index : nodes.at(-1).index;
    },

    /**
     * How far through the whole continent the pupil is, across all its books.
     * The backend computes the same number the same way.
     */
    continentProgress(mapKey) {
        const nodes = this.nodesFor(mapKey);
        const total = nodes.reduce((sum, node) => sum + (Number(node.progress) || 0), 0);
        return Math.round(total / nodes.length);
    },

    /**
     * Check if a level needs resubmission (incomplete but has existing submission).
     */
    isLevelPendingResubmission(mapKey) {
        return this.levelsPendingResubmission[mapKey]?.pending === true;
    },

    // ── Backend sync methods ──

    /**
     * Load progress and books from backend. Called once before Phaser starts.
     * On failure: console.warn, keep default client-side values (graceful degradation).
     */
    /**
     * Load progress and books from backend. Called once before Phaser starts.
     * Fixed: Resolved issues with progress not being inherited, BookList disappearing, and Level data type matching.
     */
    async loadFromBackend() {
        try {
            const [submissionsData, progressData, booksData, diplomaData] = await Promise.allSettled([
                fetchSubmissions(),
                fetchProgress(),
                fetchMyBooks(),
                fetchDiplomaBooks()
            ]);

            // --- 1. Prioritize handling the book list (ensure Book List does not disappear due to progress errors) ---
            const classBooks = (booksData.status === 'fulfilled' && Array.isArray(booksData.value))
                ? booksData.value.map(b => ({
                    title: b.title,
                    author: b.author,
                    type: b.booktype,
                    id: String(b.id),
                    pageCount: b.page_count,
                    source: 'custom',
                    category: null,
                    altTitles: [],
                    seriesNote: null,
                    needsTitleInput: false
                }))
                : [];

            // The library's list for this pupil's year. A row there is often a
            // choice rather than one book ("X tai jokin muu Y -sarjan kirja"),
            // which is what needsTitleInput marks.
            let diplomaBooks = [];
            if (diplomaData.status === 'fulfilled' && diplomaData.value) {
                const { gradeBand, books = [], continents = [] } = diplomaData.value;
                this.gradeBand = gradeBand;

                const genres = {};
                for (const mapKey of this.mapOrder) {
                    const categories = continents
                        .filter(c => c.map_key === mapKey)
                        .map(c => c.category);
                    genres[mapKey] = {
                        categories,
                        label: categories.length > 0 ? categories.join(' / ') : FREE_CHOICE_LABEL,
                        free: categories.length === 0
                    };
                }
                this.continentGenres = genres;

                diplomaBooks = books.map(b => ({
                    title: b.title,
                    author: b.author,
                    type: b.booktype,
                    id: String(b.id),
                    pageCount: b.page_count,
                    source: 'diploma',
                    category: b.category,
                    mapKey: b.map_key,
                    altTitles: Array.isArray(b.alt_titles) ? b.alt_titles : [],
                    seriesNote: b.series_note,
                    needsTitleInput: Boolean(b.needs_title_input)
                }));
            }

            if (classBooks.length > 0 || diplomaBooks.length > 0) {
                this.globalBooks = [...diplomaBooks, ...classBooks];
            }

            // --- 2. Handle progress and unlocking logic ---
            if (progressData.status === 'fulfilled' && Array.isArray(progressData.value)) {
                const progressEntries = progressData.value;
                const submissionEntries = submissionsData.status === 'fulfilled' && Array.isArray(submissionsData.value) ? submissionsData.value : []

                // If the backend returns no data at all, skip directly and keep the current frontend state
                if (progressEntries.length === 0) return;

                // One book per finished node, not one per finished continent.
                this.booksRead = progressEntries.reduce((count, entry) => (
                    count + (entry.nodes ?? []).filter((node) => node.current_progress >= 100).length
                ), 0);

                // Normalize Level indexing
                const progressByLevel = {};
                for (const entry of progressEntries) {
                    progressByLevel[Number(entry.level)] = entry;
                }

                const submissionByLevelId = {};
                for (const entry of submissionEntries) {
                    submissionByLevelId[Number(entry.completedLevel)] = entry;
                }

                // Iterate according to mapOrder
                for (let i = 0; i < this.mapOrder.length; i++) {
                    const level = i + 1;
                    const mapKey = this.mapOrder[i]; // Name of level
                    const progressEntry = progressByLevel[level]; // Progress data for this level
                    if (!progressEntry) continue;
                    const submissionEntry = submissionByLevelId[progressEntry.id]; // Submission data for this level

                    const isLevelComplete = progressEntry.level_status === 'complete' || progressEntry.level_status === 'reviewed';
                    const hasSubmission = !!submissionEntry;

                    // Restore the continent's route.
                    const nodes = Array.isArray(progressEntry.nodes) ? progressEntry.nodes : [];
                    this.mapNodes[mapKey] = Array.from(
                        { length: NODES_PER_CONTINENT },
                        (_, i) => {
                            const node = nodes.find((n) => Number(n.node_index) === i + 1);
                            return {
                                index: i + 1,
                                bookId: node?.book ? String(node.book) : null,
                                bookTitle: node?.book_title ?? null,
                                progress: Number(node?.current_progress) || 0
                            };
                        }
                    );

                    // Restore book binding
                    if (progressEntry.book) {
                        this.mapSelectedBook[mapKey] = String(progressEntry.book);
                    }

                    // Mark if level is pending resubmission
                    if (hasSubmission && !isLevelComplete) {
                        this.levelsPendingResubmission[mapKey] = { pending: true, book: progressEntry.book };
                    }

                    // Save level progress for each map (id is needed in submitQuizAnswers)
                    this.progressEntriesByMapKey[mapKey] = progressEntry || {};


                    // Restore progress percentage
                    const cfg = this.mapConfig[mapKey];
                    if (cfg) {
                        this[cfg.storage] = progressEntry.current_progress;
                    }
                    const continentNodes = this.mapNodes[mapKey];
                    for (const node of continentNodes) {
                        if (node.bookId) {
                            this.bookProgress[node.bookId] = node.progress;
                            if (node.progress === 100) this.completedBookIds[node.bookId] = true;
                        }
                    }

                    if (submissionEntry) {
                        // Restore submission answers on levels which have them
                        if (!ReadingState.quizAnswers) ReadingState.quizAnswers = {};
                        this.quizAnswers[mapKey] = [String(submissionEntry.answer1), String(submissionEntry.answer2), String(submissionEntry.answer3)];
                    }

                    // Continents are all open from the start, so this only
                    // records which ones are finished.
                    if (isLevelComplete) {
                        if (!this._continentCompletedFlags) this._continentCompletedFlags = {};
                        this._continentCompletedFlags[mapKey] = true;
                    }
                }
            }

        } catch (err) {
            console.warn('Failed to load from backend, using client defaults:', err);
        }
    },

    /**
     * Bind a book to one node of a continent (optimistic update).
     * `bookTitle` is the book the pupil says they actually read, needed when the
     * catalogue row offers a choice or names a whole series.
     */
    async saveBookSelection(mapKey, nodeIndex, bookId, bookTitle) {
        const level = this.mapOrder.indexOf(mapKey) + 1;
        if (level < 1) return;

        const nodes = this.nodesFor(mapKey).map((node) => (
            node.index === nodeIndex
                ? { ...node, bookId: String(bookId), bookTitle: bookTitle ?? null, progress: 0 }
                : node
        ));
        this.mapNodes[mapKey] = nodes;
        this.mapSelectedBook[mapKey] = String(bookId);
        this.bookProgress[String(bookId)] = 0;
        if (this.progressEntriesByMapKey[mapKey]) {
            this.progressEntriesByMapKey[mapKey].book = bookId;
            if (bookTitle) this.progressEntriesByMapKey[mapKey].book_title = bookTitle;
        }

        try {
            await setNodeBook(level, nodeIndex, bookId, bookTitle);
        } catch (err) {
            console.warn('Failed to save book selection:', err);
        }
    },

    /**
     * How far the pupil has got in the book on one node (optimistic update).
     * The continent's own percentage follows from its nodes, on both sides.
     */
    async saveNodeProgress(mapKey, nodeIndex, pct) {
        const level = this.mapOrder.indexOf(mapKey) + 1;
        if (level < 1) return;

        const nodes = this.nodesFor(mapKey).map((node) => (
            node.index === nodeIndex ? { ...node, progress: pct } : node
        ));
        this.mapNodes[mapKey] = nodes;

        const node = nodes.find((n) => n.index === nodeIndex);
        if (node?.bookId) {
            this.bookProgress[node.bookId] = pct;
            if (pct === 100) this.completedBookIds[node.bookId] = true;
        }

        const cfg = this.mapConfig[mapKey];
        if (cfg) this[cfg.storage] = this.continentProgress(mapKey);

        try {
            await setNodeProgress(level, nodeIndex, pct);
        } catch (err) {
            console.warn('Failed to save node progress:', err);
        }
    },

    /**
     * Mark level as complete in backend (optimistic update).
     */
    async saveLevelComplete(mapKey, userId) {
        const level = this.mapOrder.indexOf(mapKey) + 1;
        if (level < 1) return;
        if (!this._continentCompletedFlags) this._continentCompletedFlags = {};
        this._continentCompletedFlags[mapKey] = true;
        this.progressEntriesByMapKey[mapKey].level_status = 'complete'

        try {
            await completeLevel(level, userId);
            // Mark the bound book as completed when a level is completed
            this.booksRead = this.mapOrder.reduce((count, key) => (
                count + this.nodesFor(key).filter((node) => node.progress >= 100).length
            ), 0);
        } catch (err) {
            console.warn('Failed to save level completion:', err);
        }
    },

    /**
     * Submit quiz answers to backend.
     */
    async submitQuizAnswers(mapKey, questions, answers) {
        const progressId = this.progressEntriesByMapKey[mapKey].id;
        const isResubmission = this.isLevelPendingResubmission(mapKey)

        try {
            if (!progressId) {
                console.warn(`No progressId found for ${mapKey}`);
            }
            if (isResubmission) {
                await reSubmitQuiz({
                    question1: questions[0], answer1: answers[0],
                    question2: questions[1], answer2: answers[1],
                    question3: questions[2], answer3: answers[2]
                }, progressId);
            } else {
                await submitQuiz({
                    question1: questions[0], answer1: answers[0],
                    question2: questions[1], answer2: answers[1],
                    question3: questions[2], answer3: answers[2]
                }, progressId);
            }
            return null;
        } catch (err) {
            console.warn('Failed to submit quiz:', err);
            return err; // Return error for handling in ReactQuiz (To avoid marking level complete if submission fails)
        }
    },

    /**
     * Add completion reward to backend.
     */
    async addCompletionReward(userId, rewardType, reward) {
        try {
            await addReward(userId, rewardType, reward);
        } catch (err) {
            console.warn('Failed to add reward:', err);
        }
    }
};

export default ReadingState;
