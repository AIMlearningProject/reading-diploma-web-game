import Phaser from 'phaser';
import { COLORS, FONTS } from './constants.js';

/**
 * Shared "vintage nautical" surfaces for the Phaser UI: parchment with a gold
 * rim and a second hairline rim inset inside it, matching the ::before inner
 * frame the React cards use.
 */

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

/**
 * Paint a parchment plate onto an existing Graphics object.
 * Coordinates are the top-left corner of the plate.
 */
export function drawParchmentPlate(g, x, y, w, h, radius, options = {}) {
    const {
        s = 1,
        alpha = 0.95,
        fill = COLORS.PARCHMENT,
        rim = COLORS.GOLD,
        shadow = true
    } = options;

    if (shadow) {
        g.fillStyle(0x000000, 0.28).fillRoundedRect(x + 2 * s, y + 3 * s, w, h, radius);
    }
    g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(Math.max(2, 2.5 * s), rim, 1).strokeRoundedRect(x, y, w, h, radius);

    const inset = 4 * s;
    if (w > inset * 4 && h > inset * 4) {
        g.lineStyle(Math.max(1, 1 * s), rim, 0.45)
            .strokeRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(2, radius - inset));
    }
}

/**
 * Parchment badge: optional icon, then a line of text.
 * `anchor` is 'left', 'right' or 'center' and decides how the badge sits
 * around `x`. `iconX`/`iconY`/`iconSize` are handed back so the caller can
 * stack extra state icons (loading, done) in the same slot.
 * Returns { container, label, icon, width, height, iconX, iconY, iconSize }.
 */
export function makeParchmentBadge(scene, x, y, text, options = {}) {
    const {
        iconKey = null,
        s = 1,
        anchor = 'left',
        fontSize = 20,
        radius = 12,
        depth = 2000,
        onClick = null
    } = options;

    const padH = Math.round(14 * s);
    const padV = Math.round(9 * s);
    const iconSize = iconKey ? Math.round(22 * s) : 0;
    const iconGap = iconKey ? Math.round(8 * s) : 0;

    const label = scene.add.text(0, 0, text, {
        fontFamily: FONTS.BODY,
        fontSize: `${Math.round(fontSize * s)}px`,
        color: '#1e3a5f',
        fontStyle: '800'
    });

    const w = padH + iconSize + iconGap + label.width + padH;
    const h = padV + Math.max(label.height, iconSize) + padV;
    const iconX = padH + iconSize / 2;
    const iconY = h / 2;

    const plate = scene.add.graphics();
    drawParchmentPlate(plate, 0, 0, w, h, radius, { s });

    const children = [plate];
    let icon = null;
    if (iconKey) {
        icon = scene.add.image(iconX, iconY, iconKey).setDisplaySize(iconSize, iconSize);
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
 * Brass action button, matching the primary buttons on the React pages.
 * Anchored by its centre.
 */
export function makeParchmentButton(scene, x, y, text, options = {}) {
    const { s = 1, fontSize = 20, minWidth = 0, depth = 2000, onClick = null } = options;

    const label = scene.add.text(0, 0, text, {
        fontFamily: FONTS.BODY,
        fontSize: `${Math.round(fontSize * s)}px`,
        color: '#ffffff',
        fontStyle: '800'
    }).setOrigin(0.5);

    const w = Math.max(minWidth, label.width + 56 * s);
    const h = label.height + 24 * s;
    const radius = Math.max(4, 8 * s);

    const plate = scene.add.graphics();
    const paint = (fill) => {
        plate.clear();
        plate.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 2 * s, -h / 2 + 3 * s, w, h, radius);
        plate.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        plate.lineStyle(Math.max(1.5, 2 * s), 0xa67e1e, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    };
    paint(COLORS.GOLD);

    const container = scene.add.container(x, y, [plate, label])
        .setScrollFactor(0)
        .setDepth(depth);
    // Content is centred on the container's origin, so the hit area is too.
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input.cursor = 'pointer';
    container.on('pointerover', () => paint(COLORS.GOLD_HOVER));
    container.on('pointerout', () => { paint(COLORS.GOLD); container.setScale(1); });
    container.on('pointerdown', () => container.setScale(0.96));
    container.on('pointerup', () => { container.setScale(1); if (onClick) onClick(); });

    return { container, label, width: w, height: h };
}

/**
 * Parchment speech bubble with a little tail pointing down at whatever it
 * labels. Anchored by its bottom centre, so (x, y) is the tip of the tail.
 */
export function makeParchmentTooltip(scene, x, y, text, options = {}) {
    const { s = 1, fontSize = 13, depth = 11 } = options;

    const label = scene.add.text(0, 0, text, {
        fontFamily: FONTS.BODY,
        fontSize: `${Math.max(11, Math.round(fontSize * s))}px`,
        color: '#1e3a5f',
        fontStyle: '800'
    }).setOrigin(0.5);

    const padH = 12 * s;
    const padV = 6 * s;
    const w = label.width + padH * 2;
    const h = label.height + padV * 2;
    const tail = 7 * s;

    const plate = scene.add.graphics();
    drawParchmentPlate(plate, -w / 2, -h - tail, w, h, Math.max(4, 8 * s), { s });

    // Tail: filled triangle plus two gold edges, leaving the plate's bottom
    // border visually open where they meet.
    plate.fillStyle(COLORS.PARCHMENT, 0.95)
        .fillTriangle(-tail, -tail - 1, tail, -tail - 1, 0, 0);
    plate.lineStyle(Math.max(2, 2.5 * s), COLORS.GOLD, 1)
        .beginPath()
        .moveTo(-tail, -tail)
        .lineTo(0, 0)
        .lineTo(tail, -tail)
        .strokePath();

    label.setPosition(0, -h / 2 - tail);

    return scene.add.container(x, y, [plate, label]).setDepth(depth);
}

/**
 * Gold-rimmed medallion used for the continent markers.
 * `state` is { isUnlocked, isCompleted, isResubmittable }.
 */
export function makeMedallion(scene, level, s, state, onClick = null) {
    const { isUnlocked, isCompleted, isResubmittable } = state;
    const r = 24 * s;

    let fill = 0xd8d4c8;          // locked
    let rim = 0x9a9186;
    if (isUnlocked) {
        rim = COLORS.GOLD;
        if (isResubmittable) fill = 0xc9b3f7;
        else if (isCompleted) fill = 0x7ec98f;
        else fill = COLORS.PARCHMENT;
    }

    const g = scene.add.graphics();
    g.fillStyle(0x000000, isUnlocked ? 0.22 : 0.12).fillCircle(0, 3 * s, r);
    g.fillStyle(fill, isUnlocked ? 0.96 : 0.88).fillCircle(0, 0, r);
    g.lineStyle(Math.max(2, 3 * s), rim, 1).strokeCircle(0, 0, r);
    g.lineStyle(Math.max(1, 1 * s), rim, 0.45).strokeCircle(0, 0, r - 5 * s);

    const children = [g];

    if (isUnlocked) {
        const numberSize = Math.max(13, Math.round(20 * s));
        const number = scene.add.text(0, 0, String(level), {
            fontFamily: FONTS.HEADING,
            fontSize: `${numberSize}px`,
            color: '#1e3a5f',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        children.push(number);
    } else {
        const lock = scene.add.graphics();
        const lw = 13 * s, lh = 10 * s;
        lock.fillStyle(0x6b6459, 0.95).fillRoundedRect(-lw / 2, -lh / 2 + 2 * s, lw, lh, 2 * s);
        lock.lineStyle(Math.max(1.5, 2.5 * s), 0x6b6459, 0.95)
            .beginPath()
            .arc(0, -lh / 2 + 2 * s, 4.5 * s, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0))
            .strokePath();
        children.push(lock);
    }

    const container = scene.add.container(0, 0, children);

    if (onClick) {
        wireInteraction(container, new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains, onClick, 1.12);
    }

    return container;
}
