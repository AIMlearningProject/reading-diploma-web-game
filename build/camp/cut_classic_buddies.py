"""Cut the first-drawn P.P. and Matti out of the original buddy sheet.

    python cut_classic_buddies.py [sheet.png] [out_dir]

Default: frontend/src/assets/buddyAvatar/buddies-0001.png
         -> frontend/src/assets/buddyAvatar/classic/

buddies-0001.png is the sheet the project started with: Panda, P.P. and Matti
side by side. Its line is heavier for the figure's size than the redrawn
portraits' (figures/), which the buddy picker asked for. The JSON beside it no
longer matches the PNG (it says 1770 wide, the PNG is 1854), so the figures are
cut where fully transparent columns part them, and trimmed to their pixels.
Panda is not cut: the picker keeps the redrawn one.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
AVATAR = ROOT / 'frontend' / 'src' / 'assets' / 'buddyAvatar'
FIGURES = {1: 'pp', 2: 'matti'}     # left to right: 0 is Panda


def figures(im):
    """(left, right) of each run of columns holding any opaque pixel."""
    alpha = im.getchannel('A')
    w, h = im.size
    filled = [alpha.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]
    runs, start = [], None
    for x, on in enumerate(filled + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    # Stray specks are not figures.
    return [r for r in runs if r[1] - r[0] > 40]


def main():
    sheet = Path(sys.argv[1]) if len(sys.argv) > 1 else AVATAR / 'buddies-0001.png'
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else AVATAR / 'classic'
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(sheet).convert('RGBA')
    runs = figures(im)
    if len(runs) != 3:
        raise SystemExit(f'expected three figures, found {len(runs)}: {runs}')
    for index, name in FIGURES.items():
        left, right = runs[index]
        cut = im.crop((left, 0, right, im.height))
        cut = cut.crop(cut.getchannel('A').getbbox())
        cut.save(out / f'{name}.png')
        print(out / f'{name}.png', cut.size)


if __name__ == '__main__':
    main()
