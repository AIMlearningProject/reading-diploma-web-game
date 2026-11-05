import Phaser from 'phaser';
import { CSS_COLORS, FONTS, INK } from './constants.js';
import { iconImage } from './icons.js';
import { inkCircle, inkShape } from './ink.js';

/**
 * Shared surfaces for the Phaser UI, drawn the way ink.css draws the pupil's
 * pages. An ink outline means pressable, so a badge with nothing to press is a
 * flat sheet of paper with no line.
 */

const line = (weight, s) => Math.max(2, Math.round(weight * s));

/**
 * Wire a container up for input.
 *
 * Phaser tests a custom hit area in the object's local space, but first shifts
 * the tested point by displayOrigin -- and Container.displayOriginX is
 * `width * 0.5`. So never call setSize() on a container that carries a custom
 * hit area: width stays 0, displayOrigin stays 0, and the hit area can be
 * written in plain local coordinates. Every factory below relies on that.
 */
function wireInteraction(container, hitArea, contains, onClick, hoverScale) {
    container.setInteractive(hitArea, contains);
    container.input.cursor = 'pointer';
    container.on('pointerover', () => container.setScale(hoverScale));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => container.setScale(hoverScale * 0.9));
    container.on('pointerup', () => { container.setScale(1); onClick(); });
}

function bodyText(scene, text, size, color = CSS_COLORS.NAVY) {
    return scene.add.text(0, 0, text, {
        fontFamily: FONTS.BODY,
        fontSize: `${Math.round(size)}px`,
        color,
        fontStyle: '800'
    });
}

/**
 * A popup's sheet, placed by its top-left corner. Heavier than any button on
 * it, since it has to hold its own over the map behind it.
 */
export function makeInkPanel(scene, x, y, w, h, s = 1) {
    return inkShape(scene, x, y, w, h, {
        radius: 26 * s, line: INK.PANEL * s, drop: 11 * s, seed: 7
    });
}

/**
 * Badge: optional icon, then a line of text.
 * `anchor` is 'left', 'right' or 'center' and decides how the badge sits
 * around `x`. `iconX`/`iconY`/`iconSize` are handed back so the caller can
 * stack extra state icons (loading, done) in the same slot.
 * Returns { container, label, icon, width, height, iconX, iconY, iconSize }.
 */
export function makeInkBadge(scene, x, y, text, options = {}) {
    const {
        iconKey = null,
        s = 1,
        anchor = 'left',
        fontSize = 20,
        fill = INK.PAPER,
        depth = 2000,
        onClick = null
    } = options;

    const padH = Math.round(16 * s);
    const padV = Math.round(11 * s);
    const iconSize = iconKey ? Math.round(24 * s) : 0;
    const iconGap = iconKey ? Math.round(9 * s) : 0;

    const label = bodyText(scene, text, fontSize * s);

    const w = padH + iconSize + iconGap + label.width + padH;
    const h = padV + Math.max(label.height, iconSize) + padV;
    const iconX = padH + iconSize / 2;
    const iconY = h / 2;

    let plate;
    if (onClick) {
        plate = inkShape(scene, 0, 0, w, h, {
            radius: 16 * s, fill, line: line(INK.MID, s), drop: 5 * s, seed: 2
        });
    } else {
        plate = scene.add.graphics();
        plate.fillStyle(INK.PAPER_INT, 1).fillRoundedRect(0, 0, w, h, 6 * s);
    }

    const children = [plate];
    let icon = null;
    if (iconKey) {
        icon = iconImage(scene, iconX, iconY, iconKey, iconSize);
        children.push(icon);
    }
    label.setPosition(padH + iconSize + iconGap, h / 2).setOrigin(0, 0.5);
    children.push(label);

    let originX = x;
    if (anchor === 'right') originX = x - w;
    else if (anchor === 'center') originX = x - w / 2;

    const container = scene.add.container(originX, y, children)
        .setScrollFactor(0)
        .setDepth(depth);

    if (onClick) {
        wireInteraction(container, new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains, onClick, 1.05);
    }

    return { container, label, icon, width: w, height: h, iconX, iconY, iconSize };
}

/**
 * The primary action of a popup: flat sun, like the primary buttons on the
 * pupil's pages. Anchored by its centre.
 */
export function makeInkButton(scene, x, y, text, options = {}) {
    const { s = 1, fontSize = 20, minWidth = 0, depth = 2000, onClick = null } = options;

    const label = bodyText(scene, text, fontSize * s).setOrigin(0.5);

    const w = Math.max(minWidth, label.width + 56 * s);
    const h = label.height + 28 * s;

    const plate = inkShape(scene, -w / 2, -h / 2, w, h, {
        radius: 16 * s, fill: INK.SUN, line: line(INK.MID, s), drop: 7 * s, seed: 3
    });

    const container = scene.add.container(x, y, [plate, label])
        .setScrollFactor(0)
        .setDepth(depth);
    // Content is centred on the container's origin, so the hit area is too.
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input.cursor = 'pointer';
    container.on('pointerover', () => container.setScale(1.03));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => container.setScale(0.96));
    container.on('pointerup', () => { container.setScale(1); if (onClick) onClick(); });

    return { container, label, width: w, height: h };
}

/**
 * Speech bubble with a little tail pointing down at whatever it labels.
 * Anchored by its bottom centre, so (x, y) is the tip of the tail.
 */
export function makeInkTooltip(scene, x, y, text, options = {}) {
    const { s = 1, fontSize = 15, depth = 11 } = options;

    const label = bodyText(scene, text, Math.max(11, fontSize * s)).setOrigin(0.5);

    const w = label.width + 26 * s;
    const h = label.height + 14 * s;
    const tail = 9 * s;
    const weight = line(INK.SMALL, s);

    const bubble = inkShape(scene, -w / 2, -h - tail, w, h, { radius: 11 * s, line: weight, seed: 6 });
    const tip = scene.add.graphics();
    tip.fillStyle(INK.PAPER_INT, 1).fillTriangle(-tail, -tail - weight, tail, -tail - weight, 0, 0);
    tip.lineStyle(weight, INK.OUTLINE_INT, 1)
        .beginPath()
        .moveTo(-tail, -tail - 1)
        .lineTo(0, 0)
        .lineTo(tail, -tail - 1)
        .strokePath();

    label.setPosition(0, -h / 2 - tail);

    return scene.add.container(x, y, [bubble, tip, label]).setDepth(depth);
}

const markerFill = ({ isCompleted, isResubmittable }) => {
    if (isResubmittable) return INK.VIOLET;
    return isCompleted ? INK.GREEN : INK.PAPER;
};

function makeCompactMarker(scene, { level, state, withMarker, onClick }) {
    const container = scene.add.container(0, 0);
    if (!withMarker) return container;

    const r = 15;
    container.add([
        inkCircle(scene, 0, 0, r, { fill: markerFill(state), line: 3, seed: 20 + level }),
        bodyText(scene, String(level), 14).setOrigin(0.5)
    ]);
    wireInteraction(container, new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains, onClick, 1.12);
    return container;
}

/**
 * A continent's sign on the world map: the round marker and the plate under it
 * are one shape, and the whole of it can be pressed. (0, 0) is the marker's
 * centre. `genre` is the book kind for this pupil's year, `state` is
 * { isCompleted, isResubmittable }, and `withMarker` is false on the continent
 * the buddy stands on, which takes the marker's place.
 */
export function makeContinentSign(scene, options) {
    const { level, name, genre, state, withMarker, s, onClick } = options;
    const { isResubmittable } = state;
    const k = s / INK.WORLD_SCALE;

    // On a phone held upright the map is too small for the plates: they would
    // cover each other, so only the markers stay.
    if (k < INK.SIGN_MIN_SCALE) return makeCompactMarker(scene, options);

    const nameText = bodyText(scene, name, Math.max(12, 13.5 * k)).setOrigin(0.5);
    nameText.setLetterSpacing(Math.max(0.3, 0.4 * k));

    const genreText = genre.label
        ? scene.add.text(0, 0, genre.label.toUpperCase(), {
            fontFamily: FONTS.BODY,
            fontSize: `${Math.max(11, Math.round(11.5 * k))}px`,
            color: genre.free ? '#7a6a4a' : '#8a5a12',
            fontStyle: '800',
            align: 'center',
            wordWrap: { width: Math.max(130, 150 * k) }
        }).setOrigin(0.5)
        : null;

    // Sent back by the teacher: say so on the plate, not only in the colour of
    // the marker, which means nothing on its own.
    const redoText = isResubmittable
        ? bodyText(scene, 'TEE UUDELLEEN', Math.max(10, 11 * k), '#FDFBF4').setOrigin(0.5)
        : null;

    const gap = 4 * k;
    const redoH = redoText ? redoText.height + 6 * k : 0;
    const redoGap = redoText ? 6 * k : 0;
    const innerW = Math.max(nameText.width, genreText?.width ?? 0, redoText ? redoText.width + 16 * k : 0);
    const textH = nameText.height + (genreText ? gap + genreText.height : 0) + redoGap + redoH;

    const plateTop = 12 * k;
    const topPad = 14 * k;
    const padH = 13 * k;
    const padBottom = 10 * k;
    const plateW = innerW + padH * 2;
    const plateH = topPad + textH + padBottom;

    const plate = inkShape(scene, -plateW / 2, plateTop, plateW, plateH, {
        radius: 13 * k, line: line(INK.SMALL, k), drop: 4 * k, seed: 10 + level
    });

    let y = plateTop + topPad;
    nameText.setY(y + nameText.height / 2);
    y += nameText.height;
    const children = [plate, nameText];
    if (genreText) {
        y += gap;
        genreText.setY(y + genreText.height / 2);
        y += genreText.height;
        children.push(genreText);
    }
    if (redoText) {
        y += redoGap;
        const tagW = redoText.width + 16 * k;
        const tag = scene.add.graphics();
        tag.fillStyle(INK.VIOLET_DEEP_INT, 1).fillRoundedRect(-tagW / 2, y, tagW, redoH, Math.min(redoH / 2, 8 * k));
        redoText.setY(y + redoH / 2);
        children.push(tag, redoText);
    }

    const r = 23 * k;
    if (withMarker) {
        children.push(
            inkCircle(scene, 0, 0, r, { fill: markerFill(state), line: line(INK.MID, k), drop: 3 * k, seed: 20 + level }),
            bodyText(scene, String(level), 20 * k).setOrigin(0.5)
        );
    }

    const container = scene.add.container(0, 0, children);
    const top = withMarker ? -r : plateTop;
    wireInteraction(
        container,
        new Phaser.Geom.Rectangle(-plateW / 2, top, plateW, plateTop + plateH - top),
        Phaser.Geom.Rectangle.Contains,
        onClick,
        1.05
    );
    return container;
}
