import Phaser from 'phaser';
import bookImg from '../../assets/icons/book.png';
import closeImg from '../../assets/icons/close_16.png';
import doorImg from '../../assets/icons/door.png';
import backImg from '../../assets/icons/back.png';
import checkImg from '../../assets/icons/check.png';
import tickImg from '../../assets/icons/tick.png';
import playImg from '../../assets/icons/play.png';
import bulbImg from '../../assets/icons/bulb.png';
import hourglassImg from '../../assets/icons/hourglass.png';
import partyImg from '../../assets/icons/party.png';

// Baked by the lukudiplomi-ink-icons skill. Each PNG is the icon at `size`
// pixels inside a transparent margin, and its stepped edge only stays sharp near
// the size it was baked at.

export const ICON_KEYS = {
    HOURGLASS:   'icon-hourglass',
    PLAY:        'icon-play',
    CHECK:       'icon-check',
    PARTY:       'icon-party',
    LIGHTBULB:   'icon-lightbulb',
    BOOK:        'icon-book',
    CHECKMARK:   'icon-book-read',
    DOOR_EXIT:   'icon-door-exit',
    ARROW_LEFT:  'icon-arrow-left',
};

const ICONS = {
    [ICON_KEYS.BOOK]:       { src: bookImg,      size: 26 },
    [ICON_KEYS.DOOR_EXIT]:  { src: doorImg,      size: 26 },
    [ICON_KEYS.ARROW_LEFT]: { src: backImg,      size: 26 },
    [ICON_KEYS.CHECK]:      { src: checkImg,     size: 26 },
    [ICON_KEYS.CHECKMARK]:  { src: tickImg,      size: 32 },
    [ICON_KEYS.PLAY]:       { src: playImg,      size: 20 },
    [ICON_KEYS.LIGHTBULB]:  { src: bulbImg,      size: 30 },
    [ICON_KEYS.HOURGLASS]:  { src: hourglassImg, size: 26 },
    [ICON_KEYS.PARTY]:      { src: partyImg,     size: 38 },
};

// Inline images for use in HTML DOM elements. The margin takes back the baked
// icon's clear 10px, so it sits in a line of text at its 16px.
export const INLINE_ICONS = {
    CROSS: `<img src="${closeImg}" width="36" height="36" alt="" style="margin:-10px;vertical-align:middle">`,
};

/**
 * Call in any scene's preload() to register all icon textures.
 * Safe to call multiple times — skips already-loaded keys.
 */
export function preloadIcons(scene) {
    Object.entries(ICONS).forEach(([key, { src }]) => {
        if (!scene.textures.exists(key)) {
            scene.load.image(key, src);
        }
    });
}

/** An icon whose drawn part is `size` pixels, centred on (x, y). */
export function iconImage(scene, x, y, key, size) {
    const image = scene.add.image(x, y, key);
    image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return image.setScale(size / ICONS[key].size);
}
