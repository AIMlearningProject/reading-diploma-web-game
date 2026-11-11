import Phaser from 'phaser';

// The canvas cannot read tokens.css, so these repeat it: when a colour changes
// there, change it here. Stroke weights are at the 1280-wide reference size.
export const INK = {
    OUTLINE:         '#3a2a10',
    OUTLINE_INT:     0x3a2a10,
    PAPER:           '#fdf8ec',
    PAPER_INT:       0xfdf8ec,
    SUN:             '#e9b949',
    GREEN:           '#90c695',
    VIOLET:          '#c9b3f7',
    VIOLET_DEEP_INT: 0x865fd9,
    BIG:             6,
    MID:             5,
    SMALL:           4,
    PANEL:           11,
    DOT:             2,
    // World map sheet scale at the reference size, which the sign sizes assume.
    WORLD_SCALE:     0.74,
    SIGN_MIN_SCALE:  0.7,
};

export const CSS_COLORS = {
    NAVY:       '#1e3a5f',
    INK:        '#3a2a10',
};

export const DEPTHS = {
    PATH:           5,
    TOKEN:          50,
    // The stops sit above the buddy: they carry the stop's number and are
    // what the pupil clicks, so the character must never cover one.
    BOOK_NODE:      60,
    BOOK_NODE_TEXT: 61,
    UI:             2000,
    BOOK_LIST:      10000,
    VIDEO:          9999999,
    QUIZ:           100000,
    CELEBRATION:    100000,
};

export const FONTS = {
    BODY:    'Nunito, sans-serif',
};

// Phaser removed the `resolution` scale option in 3.16, so the game size itself
// carries the device pixel ratio and the scale manager's zoom divides it back
// out. Every size in this file is in CSS pixels and is multiplied by this.
// Capped at 3 so a 4x phone does not ask for a 16x pixel budget.
export function renderScale() {
    return Math.min(window.devicePixelRatio || 1, 3);
}

// A figure written in CSS pixels, as game-space pixels. Every hard minimum,
// threshold and padding in the canvas UI goes through this, or it would mean
// half as much on a 2x screen as it does on a 1x one.
export function px(n) {
    return n * renderScale();
}

// `width` is a game-space width, so it is divided back to CSS pixels before the
// clamp and multiplied again afterwards.
export function uiScale(width) {
    const r = renderScale();
    return Phaser.Math.Clamp(width / r / 1200, 0.7, 1.2) * r;
}
