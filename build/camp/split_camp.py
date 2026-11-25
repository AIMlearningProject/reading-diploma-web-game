"""Cut the camp scene out of its Aseprite file into the PNGs the dashboard draws.

    python split_camp.py [source.aseprite] [out_dir]

Defaults: docs/精灵-0001.aseprite -> frontend/src/assets/camp/scene.

The file is 1038 x 700. Frame 0 is the day, frames 1-5 are the night, whose
only difference from one another is the flame (a five-frame loop). Every layer
the scene moves or toggles on its own becomes its own PNG, cropped to its
pixels; layout.json says where each one sits on the 1038 x 700 stage:

    day/   sky, cloud_1..n (the clouds layer split into its separate clouds),
           land, tent, tent_border, wood, plant
    night/ sky, moon, land, tent, sleeping, tent_border, wood, fire_1..5, plant

A border layer that is always drawn with its fill is merged into it (land,
plant). The tent's border stays apart, because the sleeping layer sits
between the tent and its border. The buddies group and the old fire group
are not exported: the buddies come from the mini-game sprites.

No Aseprite install is needed: the reader below handles what this file uses
(RGBA, layers, groups, raw/compressed/linked cels).
"""
import json
import struct
import sys
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SRC = ROOT / 'docs' / '精灵-0001.aseprite'
DEFAULT_OUT = ROOT / 'frontend' / 'src' / 'assets' / 'camp' / 'scene'

DAY_FRAME = 0
NIGHT_FRAMES = [1, 2, 3, 4, 5]
# Clouds smaller than this many pixels are specks of the drawing, not clouds.
MIN_CLOUD_PIXELS = 400


def read_aseprite(path):
    """Returns (width, height, layers, cels); cels[(frame, layer)] is a stage-sized RGBA image."""
    data = path.read_bytes()
    _, magic, frames, width, height, depth = struct.unpack_from('<IHHHHH', data, 0)
    if magic != 0xA5E0:
        raise ValueError(f'{path} is not an Aseprite file')
    if depth != 32:
        raise ValueError(f'{path} uses {depth}-bit colour; only RGBA is supported')

    layers, raw_cels, links = [], {}, {}
    pos = 128
    for frame in range(frames):
        frame_bytes, _, old_chunks, _, _, new_chunks = struct.unpack_from('<IHHH2sI', data, pos)
        chunk = pos + 16
        for _ in range(new_chunks or old_chunks):
            size, kind = struct.unpack_from('<IH', data, chunk)
            body = chunk + 6
            if kind == 0x2004:
                flags, layer_type, level = struct.unpack_from('<HHH', data, body)
                name_len = struct.unpack_from('<H', data, body + 16)[0]
                name = data[body + 18:body + 18 + name_len].decode('utf-8')
                layers.append({'name': name, 'group': layer_type == 1, 'level': level})
            elif kind == 0x2005:
                layer, x, y, _, cel_type = struct.unpack_from('<HhhBH', data, body)
                p = body + 16
                if cel_type == 1:
                    links[(frame, layer)] = struct.unpack_from('<H', data, p)[0]
                else:
                    w, h = struct.unpack_from('<HH', data, p)
                    pixels = data[p + 4:chunk + size]
                    if cel_type == 2:
                        pixels = zlib.decompress(pixels)
                    image = Image.frombytes('RGBA', (w, h), pixels[:w * h * 4])
                    stage = Image.new('RGBA', (width, height))
                    stage.paste(image, (x, y))
                    raw_cels[(frame, layer)] = stage
            chunk += size
        pos += frame_bytes

    for (frame, layer), source in links.items():
        raw_cels[(frame, layer)] = raw_cels[(source, layer)]
    return width, height, layers, raw_cels


def layer_index(layers, group, name):
    """Index of the layer `name` inside the group `group`."""
    current = None
    for i, layer in enumerate(layers):
        if layer['level'] == 0:
            current = layer['name']
        elif current == group and layer['name'] == name:
            return i
    raise KeyError(f'no layer {group}/{name}')


def group_children(layers, group):
    current, found = None, []
    for i, layer in enumerate(layers):
        if layer['level'] == 0:
            current = layer['name']
        elif current == group:
            found.append(i)
    return found


def stack(cels, frame, indices, size):
    out = Image.new('RGBA', size)
    for i in indices:
        cel = cels.get((frame, i))
        if cel is not None:
            out.alpha_composite(cel)
    return out


def split_regions(image, min_pixels):
    """The image's separate opaque regions (4-connected), largest first, each on its own stage."""
    w, h = image.size
    alpha = image.getchannel('A').load()
    seen = bytearray(w * h)
    regions = []
    for start in range(w * h):
        if seen[start] or alpha[start % w, start // w] == 0:
            continue
        pixels, todo = [], [start]
        seen[start] = 1
        while todo:
            p = todo.pop()
            pixels.append(p)
            x, y = p % w, p // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    q = ny * w + nx
                    if not seen[q] and alpha[nx, ny] > 0:
                        seen[q] = 1
                        todo.append(q)
        if len(pixels) >= min_pixels:
            regions.append(pixels)
    regions.sort(key=len, reverse=True)
    src = image.load()
    out = []
    for pixels in regions:
        part = Image.new('RGBA', (w, h))
        dst = part.load()
        for p in pixels:
            dst[p % w, p // w] = src[p % w, p // w]
        out.append(part)
    # Left to right, so cloud_1 is the leftmost.
    out.sort(key=lambda part: part.getbbox()[0])
    return out


def save(stage, out_dir, rel, layout):
    box = stage.getbbox()
    if box is None:
        raise ValueError(f'{rel} is empty')
    path = out_dir / f'{rel}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    stage.crop(box).save(path, optimize=True)
    layout[rel] = {'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1]}


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    width, height, layers, cels = read_aseprite(src)
    size = (width, height)
    L = lambda group, name: layer_index(layers, group, name)

    sky = [i for i, layer in enumerate(layers) if layer['level'] == 0 and layer['name'] == 'sky']
    land = [L('land', 'land'), L('land', 'land_border')]
    plant = [L('plant', 'plant'), L('plant', 'plant_border')]
    tent, tent_border = L('tent', 'tent'), L('tent', 'tent_border')
    sleeping = next(i for i in group_children(layers, 'tent') if layers[i]['name'].startswith('sleeping'))
    wood, fire = L('fire', 'fire_wood'), L('fire', 'fire')
    # The cloud group holds the clouds by day and the moon and its glow by night.
    sky_things = [i for i in group_children(layers, 'cloud') if layers[i]['name'] != 'cloud_border']

    layout = {'stage': {'w': width, 'h': height}}
    d = DAY_FRAME
    save(stack(cels, d, sky, size), out_dir, 'day/sky', layout)
    clouds = split_regions(stack(cels, d, sky_things, size), MIN_CLOUD_PIXELS)
    for n, cloud in enumerate(clouds, 1):
        save(cloud, out_dir, f'day/cloud_{n}', layout)
    save(stack(cels, d, land, size), out_dir, 'day/land', layout)
    save(stack(cels, d, [tent], size), out_dir, 'day/tent', layout)
    save(stack(cels, d, [tent_border], size), out_dir, 'day/tent_border', layout)
    save(stack(cels, d, [wood], size), out_dir, 'day/wood', layout)
    save(stack(cels, d, plant, size), out_dir, 'day/plant', layout)

    n0 = NIGHT_FRAMES[0]
    save(stack(cels, n0, sky, size), out_dir, 'night/sky', layout)
    save(stack(cels, n0, sky_things, size), out_dir, 'night/moon', layout)
    save(stack(cels, n0, land, size), out_dir, 'night/land', layout)
    save(stack(cels, n0, [tent], size), out_dir, 'night/tent', layout)
    save(stack(cels, n0, [sleeping], size), out_dir, 'night/sleeping', layout)
    save(stack(cels, n0, [tent_border], size), out_dir, 'night/tent_border', layout)
    save(stack(cels, n0, [wood], size), out_dir, 'night/wood', layout)
    save(stack(cels, n0, plant, size), out_dir, 'night/plant', layout)
    for n, frame in enumerate(NIGHT_FRAMES, 1):
        save(stack(cels, frame, [fire], size), out_dir, f'night/fire_{n}', layout)

    layout['clouds'] = len(clouds)
    layout['fireFrames'] = len(NIGHT_FRAMES)
    (out_dir / 'layout.json').write_text(json.dumps(layout, indent=2) + '\n', encoding='utf-8')
    print(f'{len(layout) - 3} images, {len(clouds)} clouds -> {out_dir}')


if __name__ == '__main__':
    main()
