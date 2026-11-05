"""Draw the wooden desk the map sheets lie on, in the same ink style as the maps.

Planks run across the sheet with staggered end joints. Grain lines are a darker
tone of the wood and bend around the knots; only the seams are drawn in ink.

    python draw_desk.py [out_dir] [tone ...]
"""
import math
import sys

import numpy as np

from draw_maps import H, S, W, Sheet, noise1

TONES = {
    # base, lighter, darker, grain
    'd1': ((214, 162, 96), (224, 176, 112), (202, 148, 84), (168, 112, 58)),      # honey
    'd2': ((192, 114, 66), (204, 128, 76), (178, 102, 58), (142, 76, 40)),        # the harbour boat's hull
    'd3': ((232, 206, 156), (238, 216, 170), (224, 194, 142), (194, 158, 104)),   # pale driftwood
}
PLANK_TOPS = (0, 150, 318, 470, 640, H)
SEAM = 5.5


def knot_bend(x, y, knots):
    """How far a grain line at height y is pushed aside by the knots near x."""
    bend = np.zeros_like(x)
    for kx, ky, r in knots:
        side = 1 if y >= ky else -1
        reach = max(0.0, 1 - abs(y - ky) / (r * 3.4))
        bend += side * r * 1.15 * reach * np.exp(-((x - kx) / (r * 2.4)) ** 2)
    return bend


def draw(tone, seed):
    base, light, dark, grain = TONES[tone]
    s = Sheet(seed, base)
    rng = np.random.default_rng(seed)

    planks = list(zip(PLANK_TOPS[:-1], PLANK_TOPS[1:]))
    for i, (top, bottom) in enumerate(planks):
        # A plank is two or three boards laid end to end, each its own tone.
        first = rng.uniform(220, 560)
        joints = [first, first + rng.uniform(320, 460)][:1 + i % 2]
        edges = [0, *joints, W]
        for k, (a, b) in enumerate(zip(edges[:-1], edges[1:])):
            fill = (base, light, dark)[(i + k * 2) % 3]
            s.d.rectangle((a * S, top * S, b * S, bottom * S), fill=fill)

        knots = []
        for _ in range(int(rng.integers(1, 3))):
            knots.append((rng.uniform(90, W - 90), rng.uniform(top + 44, bottom - 44), rng.uniform(13, 20)))

        for y in np.arange(top + 15, bottom - 8, 15.0):
            x = np.arange(-20, W + 20, 8.0)
            wave = noise1(len(x), 26, rng) * 3.4 + y + rng.uniform(-3, 3)
            s.stroke(np.column_stack([x, wave + knot_bend(x, y, knots)]), 2.6, closed=False, color=grain)

        for kx, ky, r in knots:
            for ring in (1.0, 0.56):
                a = np.linspace(0, 2 * math.pi, 40, endpoint=False)
                ellipse = np.column_stack([kx + np.cos(a) * r * 1.55 * ring, ky + np.sin(a) * r * ring])
                s.stroke(s.wobble(ellipse, 0.8), 3, gaps=False, color=grain)

        for j in joints:
            s.stroke(s.wobble(np.array([(j, top), (j, bottom)], float), 1.0, closed=False), SEAM, closed=False, gaps=False)
            for side in (-1, 1):
                for ny in (top + 24, bottom - 24):
                    nail = (j + side * 17) * S, ny * S
                    r = 3.2 * S
                    s.d.ellipse((nail[0] - r, nail[1] - r, nail[0] + r, nail[1] + r), fill=(40, 34, 30))

    for top in PLANK_TOPS[1:-1]:
        seam = s.wobble(np.array([(-30, top), (W + 30, top)], float), 1.5, closed=False)
        s.stroke(seam, SEAM, closed=False)
    return s.finish()


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    for tone in sys.argv[2:] or TONES:
        draw(tone, 20).save(f'{out}/desk-{tone}.jpg', quality=84, optimize=True)
        print(tone)


if __name__ == '__main__':
    main()
