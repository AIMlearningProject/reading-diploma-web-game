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

export function uiScale(width) {
    return Phaser.Math.Clamp(width / 1200, 0.7, 1.2);
}
