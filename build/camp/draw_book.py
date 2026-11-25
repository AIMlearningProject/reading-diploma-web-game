"""Draw the open book a buddy reads at the camp, lying on its lap.

    python draw_book.py [out_dir]

Default: frontend/src/assets/camp/buddies. Writes four PNGs of one size:

    book_open.png       the book at rest
    book_turn_1..3.png  a page turning over, three frames

The buddies have no reading pose, so the scene lays this book over their
sitting sprite. The book is seen from the side, as the buddy is: the half
nearer the viewer shows its red cover, the far half shows its page with lines
of text. It is drawn upright first, spine on the right, then laid down a
quarter turn clockwise so it rests on the lap with the pages facing up at the
face. A turning page is a sheet from the far half swinging over to the near
one; it narrows as it goes and ends behind the cover.

Drawn the sprites' way, not in the ink style: flat fills, hard edges, no
anti-aliasing, and an outline close to the sprites' own 11 px.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / 'frontend' / 'src' / 'assets' / 'camp' / 'buddies'

HEIGHT = 56          # the spine's length
TILT = 10            # degrees the upright book leans back
NEAR = 14            # how wide the near half (the cover) looks
FAR = 36             # how wide the far half (the open page) looks
OUTLINE = 10
TURNS = (0.25, 0.5, 0.75)

INK = (5, 5, 5, 255)
RED = (208, 83, 63, 255)
SPINE = (170, 60, 48, 255)
PAPER = (253, 251, 244, 255)
TEXT = (176, 160, 132, 255)
CANVAS = 140


def outlined(shape, width):
    alpha = shape.getchannel('A').point(lambda a: 255 if a else 0)
    grown = alpha.filter(ImageFilter.MaxFilter(2 * width + 1))
    out = Image.new('RGBA', shape.size)
    out.paste(INK, mask=grown)
    out.alpha_composite(shape)
    return out


def upright(turn=None):
    """The book standing, spine on the right; `turn` (0 to 1) shows a page on its way over."""
    image = Image.new('RGBA', (CANVAS, CANVAS))
    draw = ImageDraw.Draw(image)
    lean = math.radians(TILT)
    bottom = (110, 110)
    top = (bottom[0] - HEIGHT * math.sin(lean), bottom[1] - HEIGHT * math.cos(lean))

    def half(width, grow, pad=0):
        # From the spine out to a fore-edge `width` to the left, `grow` taller at each end.
        return [(bottom[0] + pad * 0.3, bottom[1] + pad), (top[0] + pad * 0.3, top[1] - pad),
                (top[0] - width - pad, top[1] - grow - pad), (bottom[0] - width - pad, bottom[1] + grow + pad)]

    draw.polygon(half(FAR, -2, 4), fill=RED)
    draw.polygon(half(FAR, -2), fill=PAPER)
    # Lines of text run along the spine, so they lie level once the book is down.
    for row in range(3):
        inset = NEAR + 5 + row * 6
        draw.line([(bottom[0] - inset, bottom[1] - 8), (top[0] - inset, top[1] + 8)], fill=TEXT, width=3)
    if turn is not None:
        width = FAR + (NEAR - FAR) * (0.5 - 0.5 * math.cos(math.pi * turn))
        if width > 3:
            draw.polygon(half(width, -2 + 6 * turn), fill=PAPER, outline=INK, width=3)
    near = half(NEAR, 4)
    draw.polygon(near, fill=RED)
    draw.line([near[2], near[3]], fill=INK, width=5)
    draw.line([near[0], near[1]], fill=SPINE, width=6)
    return outlined(image, OUTLINE)


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = {'book_open': upright()}
    for n, turn in enumerate(TURNS, 1):
        frames[f'book_turn_{n}'] = upright(turn)
    # Laid down a quarter turn clockwise; an exact quarter turn keeps every pixel.
    frames = {name: image.rotate(-90, expand=True) for name, image in frames.items()}
    box = frames['book_open'].getbbox()
    for image in frames.values():
        other = image.getbbox()
        box = (min(box[0], other[0]), min(box[1], other[1]), max(box[2], other[2]), max(box[3], other[3]))
    for name, image in frames.items():
        image.crop(box).save(out_dir / f'{name}.png', optimize=True)
    print(f'{box[2] - box[0]} x {box[3] - box[1]} -> {out_dir}')


if __name__ == '__main__':
    main()
