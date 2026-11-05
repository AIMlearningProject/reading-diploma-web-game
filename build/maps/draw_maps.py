"""Draw simple continent sheets in the harbour's ink style, and their routes.

Every sheet is 1280x800 logical units (16:10, drawn at 2x). Land and routes are
hand-placed in lon/lat, so a route is tied to the land it runs over.

    python draw_maps.py [out_dir] [key ...]
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

W, H, S = 1280, 800, 2
INK = (40, 34, 30)
SEA = (122, 176, 214)
SEA_ICE = (168, 204, 226)
LEAF = (236, 222, 96)
SNOW = (250, 249, 243)

SAFE_TOP = 92      # the corner and title badges live above this
SAFE_EDGE = 44
# Title and corner badges at the game's 1280 reference width, and the part of
# the buddy that stands above the waypoint it is on (measured in the game).
HUD = ((0, 0, 200, 72), (430, 0, 850, 72), (1060, 0, 1280, 72))
BUDDY_HALF_W, BUDDY_TOP = 55, 115


def noise1(n, scale, rng):
    """Smooth 1D noise, roughly -1..1."""
    knots = rng.standard_normal(int(n / scale) + 4)
    x = np.arange(n) / scale
    i = x.astype(int)
    f = x - i
    f = f * f * (3 - 2 * f)
    return (knots[i] * (1 - f) + knots[i + 1] * f) * 0.7


def chaikin(pts, rounds=2, closed=True):
    p = np.array(pts, float)
    for _ in range(rounds):
        q = np.roll(p, -1, axis=0) if closed else p[1:]
        a = p if closed else p[:-1]
        new = np.empty((len(a) * 2, 2))
        new[0::2] = a * 0.75 + q * 0.25
        new[1::2] = a * 0.25 + q * 0.75
        p = new if closed else np.vstack([p[0], new, p[-1]])
    return p


def resample(p, step, closed=True):
    q = np.vstack([p, p[:1]]) if closed else p
    seg = np.hypot(*np.diff(q, axis=0).T)
    t = np.concatenate([[0], np.cumsum(seg)])
    n = max(int(t[-1] / step), 4)
    u = np.linspace(0, t[-1], n, endpoint=not closed)
    return np.column_stack([np.interp(u, t, q[:, 0]), np.interp(u, t, q[:, 1])])


class Sheet:
    def __init__(self, seed, sea=SEA):
        self.rng = np.random.default_rng(seed)
        self.img = Image.new('RGB', (W * S, H * S), sea)
        self.d = ImageDraw.Draw(self.img)
        self.land = Image.new('L', (W * S, H * S), 0)
        self.ld = ImageDraw.Draw(self.land)
        self.marks = []    # (x, y, radius) of every landmark, for the checks

    def wobble(self, p, amount=3.0, closed=True):
        q = resample(p, 5, closed)
        n = len(q)
        scale = 14
        if closed:   # the noise must meet itself at the seam
            blend = np.linspace(0, 1, n)
            nx = noise1(n * 2, scale, self.rng)
            ny = noise1(n * 2, scale, self.rng)
            ox = nx[:n] * (1 - blend) + nx[n:2 * n] * blend
            oy = ny[:n] * (1 - blend) + ny[n:2 * n] * blend
        else:
            ox, oy = noise1(n, scale, self.rng), noise1(n, scale, self.rng)
        return q + np.column_stack([ox, oy]) * amount

    def stroke(self, p, width=6.5, closed=True, gaps=True, color=INK):
        q = resample(p, 1.2, closed)
        n = len(q)
        thick = 1 + 0.32 * noise1(n, 60, self.rng)
        gap = noise1(n, 45, self.rng) if gaps else np.zeros(n)
        for (x, y), t, g in zip(q, thick, gap):
            if g > 1.0:
                continue
            r = width * t * S / 2
            self.d.ellipse((x * S - r, y * S - r, x * S + r, y * S + r), fill=color)

    def shape(self, pts, fill, width=5, smooth=1, wobble=1.2, offset=(-2.5, 2)):
        """A flat fill printed slightly off its ink line, as on the harbour."""
        p = chaikin(pts, smooth) if smooth else np.array(pts, float)
        p = self.wobble(p, wobble) if wobble else p
        if fill:
            self.d.polygon([((x + offset[0]) * S, (y + offset[1]) * S) for x, y in p], fill=fill)
        if width:
            self.stroke(p, width)
        return p

    def line(self, pts, width=5, smooth=1):
        p = chaikin(pts, smooth, closed=False) if smooth else np.array(pts, float)
        self.stroke(self.wobble(p, 0.8, closed=False), width, closed=False, gaps=False)

    def add_land(self, pts, fill=LEAF, width=7):
        p = chaikin(pts, 2)
        p = self.wobble(p, 3.2)
        self.d.polygon([((x - 4) * S, (y + 3) * S) for x, y in p], fill=fill)
        self.ld.polygon([(x * S, y * S) for x, y in p], fill=255)
        return p

    def ink_land(self, p, width=7):
        self.stroke(p, width)

    def finish(self):
        """Paper grain: fine scratches and speckle, darkening only."""
        a = np.asarray(self.img, np.float32)
        g = np.random.default_rng(11)
        streak = gaussian_filter(g.standard_normal(a.shape[:2]), (26, 1.1))
        streak /= streak.std()
        speck = gaussian_filter(g.standard_normal(a.shape[:2]), 1.0)
        speck /= speck.std()
        cloudy = gaussian_filter(g.standard_normal(a.shape[:2]), 90)
        cloudy /= cloudy.std()
        shade = 1 - 0.13 * (streak > 1.5) - 0.07 * (speck > 1.7) + 0.022 * cloudy
        return Image.fromarray(np.clip(a * shade[..., None], 0, 255).astype(np.uint8))


class Projection:
    """lon/lat to sheet units, fitted into the safe box around the given land."""

    def __init__(self, polys, stretch=1.0, box=(60, 96, 1220, 776), center=None):
        lat0 = np.mean([p[1] for poly in polys for p in poly])
        self.k = math.cos(math.radians(lat0)) * stretch
        xs = [p[0] * self.k for poly in polys for p in poly]
        ys = [-p[1] for poly in polys for p in poly]
        self.scale = min((box[2] - box[0]) / (max(xs) - min(xs)), (box[3] - box[1]) / (max(ys) - min(ys)))
        cx = center if center is not None else (box[0] + box[2]) / 2
        self.ox = cx - self.scale * (max(xs) + min(xs)) / 2
        self.oy = (box[1] + box[3]) / 2 - self.scale * (max(ys) + min(ys)) / 2

    def __call__(self, lon, lat):
        return (self.ox + lon * self.k * self.scale, self.oy - lat * self.scale)

    def many(self, pts):
        return [self(*p) for p in pts]


AFRICA = [(-17, 15), (-17, 21), (-13, 27), (-9, 32), (-6, 35.5), (3, 37), (10, 37), (11, 33.5), (20, 31), (25, 32), (32, 31),
          (34, 28), (37, 21), (39, 15), (43, 11.5), (51, 12), (48, 5), (42, -1), (39, -6), (40, -15), (35, -20), (35, -24),
          (32, -29), (26, -34), (20, -35), (18, -33), (15, -27), (12, -17), (13, -8), (9, -1), (9, 4), (4, 6), (-4, 5),
          (-8, 4.5), (-13, 8.5)]
MADAGASCAR = [(44, -16), (49, -12), (50, -16), (47, -25), (44, -25), (43, -21)]

SOUTH_AMERICA = [(-77, 8), (-72, 12), (-62, 10.5), (-52, 5), (-50, 0), (-44, -2.5), (-35, -6), (-35, -9), (-39, -14), (-40, -22),
                 (-48, -26), (-49, -29), (-53, -34), (-58, -35), (-57, -38), (-62, -39), (-65, -43), (-66, -47), (-69, -52),
                 (-66, -55), (-72, -54), (-75, -48), (-73, -40), (-71, -30), (-70, -18), (-76, -14), (-81, -5), (-80, 0), (-78, 3)]
FALKLAND = [(-61, -51), (-58, -51), (-58, -52.5), (-61, -52.5)]

NORTH_AMERICA = [(-168, 66), (-162, 70), (-156, 71), (-140, 70), (-128, 70), (-115, 68), (-100, 68), (-95, 72), (-85, 69), (-82, 66),
                 (-94, 60), (-92, 57), (-82, 55), (-79, 52), (-79, 57), (-77, 62), (-70, 61), (-65, 60), (-60, 55), (-56, 52),
                 (-65, 49), (-60, 46), (-66, 44), (-70, 43), (-74, 40), (-76, 35), (-81, 31), (-80, 26), (-81, 25), (-83, 29),
                 (-89, 30), (-94, 29), (-97, 26), (-97, 21), (-94, 18), (-90, 21), (-87, 21), (-88, 16), (-83, 15), (-83, 10),
                 (-78, 9), (-80, 7), (-85, 10), (-92, 14), (-96, 16), (-105, 20), (-109, 25), (-112, 30), (-117, 33), (-122, 37),
                 (-124, 42), (-124, 48), (-130, 54), (-135, 58), (-145, 60), (-152, 59), (-160, 55), (-158, 58), (-165, 62)]
GREENLAND = [(-73, 78), (-60, 82), (-30, 83), (-20, 78), (-22, 71), (-42, 60), (-50, 62), (-55, 70), (-62, 76)]
CUBA = [(-85, 22), (-80, 23.5), (-74, 20), (-78, 20)]

EUROPE = [(-9, 37), (-9, 43), (-2, 43.5), (-1, 46), (-4.5, 48.5), (2, 51), (8, 54), (8.5, 57), (11, 56), (10, 54), (14, 54), (19, 54.5),
          (21, 57), (24, 59), (30, 60), (23, 60), (21, 62), (25, 65.5), (22, 66), (17, 62), (18, 59), (16, 56), (13, 55.5), (11, 59),
          (6, 58), (5, 62), (12, 66), (18, 70), (26, 71), (31, 70), (41, 67), (40, 64), (45, 68), (50, 68), (50, 46), (40, 47), (38, 45),
          (33, 46), (30, 46), (28, 43), (29, 41), (26, 40.5), (23, 40), (24, 38), (22, 36.5), (19, 41), (19.5, 42), (14, 45), (12.5, 44),
          (16, 41.5), (18, 40), (16, 38), (15.5, 40), (11, 42.5), (9, 44), (3, 43), (0, 40), (-1, 37.5), (-5, 36)]
BRITAIN = [(-5, 50), (1, 51), (1.5, 53), (-2, 56), (-3, 58.5), (-6, 57.5), (-3, 54), (-5, 52)]
IRELAND = [(-10, 52), (-6, 52), (-6, 55), (-9, 54.5)]
ICELAND = [(-24, 65), (-14, 66), (-14, 64), (-22, 63.5)]
SICILY = [(12.5, 38), (15.5, 38), (15, 36.8)]
SARDINIA = [(8.5, 41), (9.7, 41), (9.5, 39), (8.5, 39)]

ASIA = [(26, 40), (27, 37), (36, 36), (35, 31), (34, 28), (39, 21), (43, 13), (52, 16), (59, 22), (56, 25), (51, 25), (48, 30), (56, 27),
        (62, 25), (67, 25), (72, 21), (73, 16), (77, 8), (80, 13), (82, 17), (87, 21), (91, 22), (94, 16), (98, 16), (99, 10), (103, 2),
        (104, 2), (100.5, 13), (105, 9), (109, 12), (106, 19), (110, 21), (117, 23), (122, 30), (118, 37), (122, 40), (125, 40), (126, 35),
        (129, 36), (128, 41), (135, 44), (141, 52), (137, 54), (143, 59), (156, 61), (156, 57), (160, 53), (163, 60), (178, 63), (180, 68),
        (170, 70), (140, 72), (113, 74), (100, 77), (80, 73), (68, 69), (60, 68), (50, 68), (50, 46), (42, 42), (30, 41)]
JAPAN = [(130, 31.5), (136, 33.5), (141, 36), (142, 40), (145, 44), (141, 45), (139, 39), (132, 35)]
SUMATRA = [(95, 5.5), (100, 2), (106, -4), (104, -6), (98, 0)]
BORNEO = [(109, 1), (113, 5), (118, 6), (118, 1), (115, -4), (110, -3)]
SRI_LANKA = [(80, 9.5), (82, 7.5), (80.5, 6)]
PHILIPPINES = [(120, 18), (122, 18), (126, 8), (122, 7), (120, 14)]

AUSTRALIA = [(114, -22), (122, -18), (126, -14), (131, -12), (136, -12), (136, -15), (140, -17), (142, -11), (146, -19), (153, -26),
             (153, -31), (150, -37), (146, -39), (141, -38), (136, -35), (131, -32), (124, -33), (116, -35), (114, -30)]
TASMANIA = [(145, -41), (148, -41), (148, -43.5), (146, -43.5)]
NZ_NORTH = [(172.5, -34.5), (176.5, -36.5), (179.5, -38), (176, -42), (173, -40)]
NZ_SOUTH = [(172.5, -41), (174, -42), (170, -46.5), (167, -46), (168, -44)]
NEW_GUINEA = [(131, -1), (141, -3), (147, -6), (150, -10), (144, -8), (138, -8), (133, -4)]

SHEETS = {}


def sheet(fn):
    SHEETS[fn.__name__] = fn
    return fn


@sheet
def africa():
    s = Sheet(6)
    pr = Projection([AFRICA], stretch=1.28, center=640)
    land = [s.add_land(pr.many(p)) for p in (AFRICA, MADAGASCAR)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(-7, 26), (8, 25), (17, 22), (32, 18), (22, 14), (8, 15), (-6, 13), (20, 3), (31, -8), (22, -17), (24, -29)])
    return s, route


@sheet
def southamerica():
    s = Sheet(5)
    pr = Projection([SOUTH_AMERICA], stretch=1.42, center=640)
    land = [s.add_land(pr.many(p)) for p in (SOUTH_AMERICA, FALKLAND)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(-74, 1), (-61, 3), (-53, 1), (-67, -3), (-58, -7), (-46, -6), (-42, -15), (-57, -16), (-65, -24), (-56, -30), (-68, -43)])
    return s, route


@sheet
def northamerica():
    s = Sheet(4)
    pr = Projection([NORTH_AMERICA, GREENLAND], stretch=1.15, center=640)
    land = [s.add_land(pr.many(p)) for p in (NORTH_AMERICA, GREENLAND, CUBA)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(-152, 65), (-130, 64), (-110, 62), (-100, 56), (-117, 50), (-112, 42), (-100, 40), (-86, 38), (-99, 32), (-102, 23), (-90, 17)])
    return s, route


@sheet
def europe():
    s = Sheet(2)
    pr = Projection([EUROPE, ICELAND], stretch=1.1, center=660)
    land = [s.add_land(pr.many(p)) for p in (EUROPE, BRITAIN, IRELAND, ICELAND, SICILY, SARDINIA)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(-6, 40), (-1, 42), (3, 47), (10, 46), (14, 42.5), (22, 41), (27, 47), (20, 51), (10, 52), (15, 59.5), (26, 63)])
    return s, route


@sheet
def asia():
    s = Sheet(3)
    pr = Projection([ASIA, JAPAN, SUMATRA, BORNEO], stretch=1.0, center=640)
    land = [s.add_land(pr.many(p)) for p in (ASIA, JAPAN, SUMATRA, BORNEO, SRI_LANKA, PHILIPPINES)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(36, 39), (46, 34), (55, 36), (70, 27), (78, 18), (88, 26), (104, 25), (116, 30), (112, 47), (92, 50), (72, 55)])
    return s, route


@sheet
def oceania():
    s = Sheet(7)
    pr = Projection([AUSTRALIA, NEW_GUINEA, NZ_NORTH, NZ_SOUTH], stretch=1.0, box=(60, 140, 1220, 776), center=640)
    land = [s.add_land(pr.many(p)) for p in (AUSTRALIA, TASMANIA, NZ_NORTH, NZ_SOUTH, NEW_GUINEA)]
    for p in land:
        s.ink_land(p)
    route = pr.many([(144, -6), (137, -9), (134, -15), (123, -22), (122, -30), (132, -29), (142, -26), (146, -34), (151, -41), (167, -39), (175, -39.5)])
    return s, route


@sheet
def arctic():
    s = Sheet(1, SEA_ICE)
    cap = [(220, 230), (330, 190), (420, 150), (540, 175), (700, 130), (830, 180), (960, 170), (1040, 250), (1110, 300), (1010, 390),
           (1060, 470), (1100, 610), (980, 640), (860, 690), (730, 660), (600, 720), (470, 670), (330, 680), (240, 620), (150, 560),
           (250, 430), (160, 330)]
    green = [(1130, 40), (1280, 30), (1280, 240), (1210, 220), (1150, 130)]
    siberia = [(0, 690), (170, 720), (380, 750), (640, 770), (900, 760), (1280, 690), (1280, 800), (0, 800)]
    land = [s.add_land(p, SNOW) for p in (cap, green, siberia, [(30, 80), (130, 60), (170, 160), (60, 210)])]
    for p in land:
        s.ink_land(p)
    return s, [(275, 300), (370, 350), (560, 215), (690, 195), (880, 250), (980, 350), (860, 420), (600, 420), (420, 430), (300, 530), (560, 620)]


@sheet
def antarctica():
    s = Sheet(8, SEA_ICE)
    main = [(250, 250), (330, 170), (470, 150), (560, 185), (640, 140), (830, 150), (930, 205), (1010, 200), (1120, 320), (1080, 400),
            (1100, 480), (980, 590), (820, 640), (680, 610), (560, 690), (400, 650), (300, 540), (210, 470), (120, 560), (70, 540), (150, 400)]
    land = [s.add_land(p, SNOW) for p in (main, [(40, 640), (120, 620), (140, 680), (60, 700)])]
    for p in land:
        s.ink_land(p)
    return s, [(130, 470), (250, 400), (340, 410), (610, 230), (800, 240), (980, 280), (1040, 400), (880, 420), (690, 520), (560, 420), (500, 610)]


def check(key, s, route):
    """Route rules, enforced on every sheet. Returns a list of failures."""
    fails = []
    land = np.array(s.land) > 0
    nodes = [route[i] for i in (0, 3, 7, 10)]
    bends = [route[i] for i in (5, 9)]
    for i, (x, y) in enumerate(route):
        if not (SAFE_EDGE <= x <= W - SAFE_EDGE and SAFE_TOP <= y <= H - SAFE_EDGE):
            fails.append(f'point {i} ({x:.0f},{y:.0f}) outside the safe box')
    for i, (x, y) in enumerate(route):
        for left, top, right, bottom in HUD:
            if x + BUDDY_HALF_W > left and x - BUDDY_HALF_W < right and y - BUDDY_TOP < bottom:
                fails.append(f'buddy on point {i} ({x:.0f},{y:.0f}) runs under a badge')
    for n, (x, y) in enumerate(nodes):
        yy, xx = np.ogrid[:H * S, :W * S]
        disc = (xx - x * S) ** 2 + (yy - y * S) ** 2 <= (30 * S) ** 2
        share = land[disc].mean()
        if share < 0.6:
            fails.append(f'node {n + 1} only {share:.0%} on land')
    for a in range(4):
        for b in range(a + 1, 4):
            if math.dist(nodes[a], nodes[b]) < 90:
                fails.append(f'nodes {a + 1} and {b + 1} closer than 90')
    for b in bends:
        for n, node in enumerate(nodes):
            if math.dist(b, node) < 62:
                fails.append(f'video stop too close to node {n + 1}')
    for mx, my, r in s.marks:
        for n, node in enumerate(nodes):
            if math.dist((mx, my), node) < r + 30:
                fails.append(f'landmark at ({mx:.0f},{my:.0f}) under node {n + 1}')
    return fails


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    keys = sys.argv[2:] or list(SHEETS)
    routes, bad = {}, 0
    for key in keys:
        s, route = SHEETS[key]()
        s.finish().save(f'{out}/{key}.jpg', quality=86, optimize=True)
        routes[key] = [{'x': round(x), 'y': round(y)} for x, y in route]
        fails = check(key, s, route)
        bad += len(fails)
        print(key, 'OK' if not fails else fails)
    with open(f'{out}/routes.json', 'w') as f:
        json.dump(routes, f)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
