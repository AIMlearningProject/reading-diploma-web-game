"""Write the day beach with its sea drawn the whole way across.

    python fill_sea.py [land.png] [out.png]

Default: frontend/src/assets/camp/scene/day/land.png -> land_full.png beside it.

In the Aseprite file the day land's sea band starts at x 331: left of it the
tent stands, so the sea was never drawn there. The buddy picker (which shows
the beach before the tent is up) needs the whole band. This carries the band to
the left edge: its top line stays level with where it starts, its lower edge
eases down to the depth the band has further right, and the sand under the new
sea is pushed down, in the art's own flat colours and stepped pixel edges.
land.png itself (the camp's) is left as exported.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DAY = ROOT / 'frontend' / 'src' / 'assets' / 'camp' / 'scene' / 'day'
SEA = (80, 161, 212, 255)
SAND = (255, 240, 137, 255)
START = 331          # first column the sea is drawn in
STEP = 23            # columns per stair step of an edge, as in the drawn band


def band(im, x):
    """Top and bottom (exclusive) of the sea in column x."""
    col = [im.getpixel((x, y)) for y in range(80)]
    top = next(y for y, c in enumerate(col) if c == SEA)
    return top, next(y for y, c in enumerate(col) if y > top and c != SEA)


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DAY / 'land.png'
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DAY / 'land_full.png'
    im = Image.open(src).convert('RGBA')
    top0, _ = band(im, START + 2)
    _, deep = band(im, START + 80)          # the band's depth once it is under way
    for x in range(START):
        # Stepped edges: the top wobbles by a pixel, the bottom keeps the full depth.
        step = (START - x) // STEP
        top = top0 + (1 if step % 3 == 1 else 0)
        bottom = deep - (1 if step % 4 == 2 else 0)
        for y in range(top, bottom):
            im.putpixel((x, y), SEA)
        # Sand below the new sea, so no gap opens between the two.
        y = bottom
        while y < im.height and im.getpixel((x, y))[3] == 0:
            im.putpixel((x, y), SAND)
            y += 1
    # Where the drawn band begins it is shallow (the tent's edge stood there),
    # leaving a bump of sand in the water: deepen those columns to match.
    for x in range(START, START + 40):
        t, b = band(im, x)
        for y in range(b, deep):
            im.putpixel((x, y), SEA)
    im.save(out)
    print(out)


if __name__ == '__main__':
    main()
