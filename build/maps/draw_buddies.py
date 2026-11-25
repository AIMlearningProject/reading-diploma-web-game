"""Draw the three buddies that stand on the game maps, in the ink icon style.

    python draw_buddies.py [out_dir]

Same steps as the ink icons: paint straight strokes on a grid, displace them
with smooth noise, cut alpha to on/off. The grid is 40 x 56 and all three share
one figure (head, body, legs on one baseline), so they read as one family next
to the maps' thick coastlines. The dashboard picker keeps the detailed figures.

The look was approved at 136 px for the 56-unit grid with a 2.8-unit stroke.
SCALE bakes it larger with the noise stretched to match, so it stays sharp on
high-density screens; all three are cropped to one shared frame, so the game
scales them by one height and they keep their relative sizes.
"""
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

GW, GH = 40, 56
APPROVED_HEIGHT = 136   # px for GH at 1x, as on the approved sheet
WEIGHT = 2.8            # stroke in grid units
AMOUNT = 4              # wobble in 1x pixels, as for the ink icons
SEED = 3
SCALE = 3
PAD = 10                # 1x pixels around the grid, so the wobble is not cut off
SS = 4                  # paint oversampling

INK = '#3a2a10'
COL = {
    'ink': INK,
    'sun': '#e9b949',
    'skin': '#fcd5b0',
    'm_hair': '#b5795a', 'm_shirt': '#7fb1d9', 'm_shorts': '#d4bc7c',
    'p_fur': '#f2b465', 'p_cap': '#4d7fb5',
    'pp_hair': '#2f3e52', 'pp_coat': '#4f7d74', 'pp_legs': '#8c8c8c',
}

OUT = Path(__file__).resolve().parents[2] / 'frontend' / 'src' / 'assets' / 'buddyAvatar' / 'map'


def ell(cx, cy, rx, ry):
    k = 0.5523
    return (f'M{cx - rx} {cy}C{cx - rx} {cy - ry * k} {cx - rx * k} {cy - ry} {cx} {cy - ry}'
            f'C{cx + rx * k} {cy - ry} {cx + rx} {cy - ry * k} {cx + rx} {cy}'
            f'C{cx + rx} {cy + ry * k} {cx + rx * k} {cy + ry} {cx} {cy + ry}'
            f'C{cx - rx * k} {cy + ry} {cx - rx} {cy + ry * k} {cx - rx} {cy}Z')


# One shared figure: two legs, a bean body, a round head, dot eyes.
LEGS = ['M13.5 41H19.3V50.3C19.3 52.6 13.5 52.6 13.5 50.3Z', 'M20.7 41H26.5V50.3C26.5 52.6 20.7 52.6 20.7 50.3Z']
BODY = 'M11.5 44C11.5 37 14 32.5 20 32.5C26 32.5 28.5 37 28.5 44Z'
HEAD = ell(20, 20, 12, 11.5)
EYES = [ell(16, 23, 0.6, 0.9), ell(24, 23, 0.6, 0.9)]


def figure(legs, body, head, extra_front=(), coat=None, under=()):
    """An op is { d, fill?, line?, wobble? }; `line: False` paints no outline,
    `wobble: False` keeps a dot round by placing it after the noise."""
    ops = [{'d': d, 'fill': legs} for d in LEGS]
    ops += list(under)
    ops.append({'d': coat or BODY, 'fill': body})
    ops.append({'d': HEAD, 'fill': head})
    ops += list(extra_front)
    ops += [{'d': d, 'fill': 'ink', 'wobble': False} for d in EYES]
    return ops


BUDDIES = {
    # Matti. A shorter shirt leaves room for the shorts.
    'matti': figure('skin', 'm_shirt', 'skin', coat='M11.5 40.5C11.5 35.5 14 32.5 20 32.5C26 32.5 28.5 35.5 28.5 40.5Z', under=[
        {'d': 'M12 38H28L27.8 46.8H21L20 44.3L19 46.8H12.2Z', 'fill': 'm_shorts'},
    ], extra_front=[
        {'d': 'M8 21C7 13 11 8 17 7.5L21 3.5L22.5 7.5C29 8 33 13 32 21L28.5 16.5L24.5 18.5L20.5 14.5L16 18L11.5 16Z',
         'fill': 'm_hair'},
    ]),
    # Panda, the cat. No neck and no separate legs: one squat body with two feet.
    # It stands on the same baseline but about 80 % as tall, as on the picker sheet.
    'panda': [
        {'d': 'M8.5 27L9.5 13.5L17 21.5Z', 'fill': 'p_fur'},
        {'d': 'M31.5 27L30.5 13.5L23 21.5Z', 'fill': 'p_fur'},
        # The headband's knot ends, sticking out on the left.
        {'d': 'M7 24.5L3.5 22.5'},
        {'d': 'M7 26L3.5 27.5'},
        {'d': 'M4 36C4 26 11 21 20 21C29 21 36 26 36 36C36 42 32.5 46.5 27 47.5L27 50.8C27 53 21.2 53 21.2 50.8'
              'L21.2 48.3L18.8 48.3L18.8 50.8C18.8 53 13 53 13 50.8L13 47.5C7.5 46.5 4 42 4 36Z',
         'fill': 'p_fur'},
        {'d': 'M5.2 29C7 23.5 12.5 19.5 20 19.5C27.5 19.5 33 23.5 34.8 29C27 26.5 13 26.5 5.2 29Z', 'fill': 'p_cap'},
    ] + [{'d': ell(cx, 33.5, 1.1, 1.1), 'fill': 'ink', 'wobble': False} for cx in (15, 25)],
    # P.P. Blunt bangs cut straight across the whole forehead, just above the
    # eyes, hair ends flicking outward at the jaw, one button.
    'pp': figure('pp_legs', 'pp_coat', 'skin', coat='M11 45.5C11 37 14 32.5 20 32.5C26 32.5 29 37 29 45.5Z', extra_front=[
        {'d': 'M4.5 28.5C6.5 27.5 7 26 6.8 23C6 13 11 6.5 20 6.5C29 6.5 34 13 33.2 23C33 26 33.5 27.5 35.5 28.5'
              'C32.5 30 30 28.5 29.8 25.5L29.8 18.5H10.2L10.2 25.5'
              'C10 28.5 7.5 30 4.5 28.5Z',
         'fill': 'pp_hair'},
        {'d': ell(20, 38.5, 1.5, 1.5), 'fill': 'sun', 'line': False, 'wobble': False},
    ]),
}


def subpaths(d):
    """Flatten M L H V C Z (absolute only) into [(points, closed)]."""
    tokens = re.findall(r'[MLHVCZ]|-?\d*\.?\d+', d)
    out, pts, i, cmd = [], [], 0, None
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd == 'Z':
                out.append((pts, True))
                pts = []
                continue
        take = lambda n: [float(v) for v in tokens[i:i + n]]
        if cmd == 'M':
            if pts:
                out.append((pts, False))
            pts = [tuple(take(2))]
            i += 2
            cmd = 'L'
        elif cmd == 'L':
            pts.append(tuple(take(2)))
            i += 2
        elif cmd == 'H':
            pts.append((take(1)[0], pts[-1][1]))
            i += 1
        elif cmd == 'V':
            pts.append((pts[-1][0], take(1)[0]))
            i += 1
        elif cmd == 'C':
            v = take(6)
            p0 = pts[-1]
            for k in range(1, 17):
                t = k / 16
                a, b, c, e = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
                pts.append((a * p0[0] + b * v[0] + c * v[2] + e * v[4], a * p0[1] + b * v[1] + c * v[3] + e * v[5]))
            i += 6
        else:
            raise ValueError(f'unsupported path command in {d}')
    if pts:
        out.append((pts, False))
    return out


def paint(ops, scale):
    k = APPROVED_HEIGHT * scale / GH
    pad = PAD * scale
    w, h = round(GW * k) + pad * 2, round(GH * k) + pad * 2
    img = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    place = lambda p: (p[0] * k * SS + pad * SS, p[1] * k * SS + pad * SS)
    lw = max(1, round(WEIGHT * k * SS))
    for op in ops:
        for pts, closed in subpaths(op['d']):
            q = [place(p) for p in pts]
            if op.get('fill'):
                draw.polygon(q, fill=COL[op['fill']])
            if op.get('line') is False:
                continue
            line = q + [q[0]] if closed else q
            draw.line(line, fill=INK, width=lw)
            for x, y in line:   # round caps and joins
                draw.ellipse((x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2), fill=INK)
    return img.resize((w, h), Image.LANCZOS)


def make_perm():
    s, p = 12345, list(range(256))
    for i in range(255, 0, -1):
        s = (s * 1103515245 + 12345) & 0x7fffffff
        j = s % (i + 1)
        p[i], p[j] = p[j], p[i]
    return np.array(p)


PERM = make_perm()


def vnoise(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    fade = lambda t: t * t * (3 - 2 * t)
    xf, yf = fade(x - xi), fade(y - yi)
    h = lambda a, b: PERM[(PERM[a & 255] + b) & 255] / 255
    top = h(xi, yi) * (1 - xf) + h(xi + 1, yi) * xf
    bot = h(xi, yi + 1) * (1 - xf) + h(xi + 1, yi + 1) * xf
    return top * (1 - yf) + bot * yf


def fbm(x, y):
    return vnoise(x * 0.06, y * 0.06) * 0.67 + vnoise(x * 0.12, y * 0.12) * 0.33


def bake(ops, scale=SCALE):
    still = [op for op in ops if op.get('wobble') is False]
    src = np.array(paint([op for op in ops if op.get('wobble') is not False], scale))
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    ox, oy = SEED * 53.7, SEED * 91.3
    nx, ny = xx / scale, yy / scale   # the noise stretches with the image
    px = (xx + np.round((fbm(nx + ox, ny + oy) - 0.5) * AMOUNT * scale)).astype(int)
    py = (yy + np.round((fbm(nx + ox + 211, ny + oy + 97) - 0.5) * AMOUNT * scale)).astype(int)
    inside = (px >= 0) & (px < w) & (py >= 0) & (py < h)
    sample = src[np.clip(py, 0, h - 1), np.clip(px, 0, w - 1)]
    keep = inside & (sample[..., 3] >= 128)
    out = np.zeros_like(src)
    out[keep] = sample[keep]
    out[keep, 3] = 255
    if still:
        top = np.array(paint(still, scale))
        on = top[..., 3] >= 128
        out[on] = top[on]
        out[on, 3] = 255
    return Image.fromarray(out)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
    out.mkdir(parents=True, exist_ok=True)
    images = {name: bake(ops) for name, ops in BUDDIES.items()}
    # One frame around all three, so they share a baseline and a scale.
    boxes = [img.getbbox() for img in images.values()]
    frame = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    for name, img in images.items():
        img.crop(frame).save(out / f'{name}.png', optimize=True)
    fw, fh = frame[2] - frame[0], frame[3] - frame[1]
    print(f'frame {fw}x{fh} px; at 1x it is {fh / SCALE:.1f} px tall '
          f'(FRAME_HEIGHT and BUDDY_ASPECT = {fw} / {fh} in game/ui/buddy.js)')


if __name__ == '__main__':
    main()
