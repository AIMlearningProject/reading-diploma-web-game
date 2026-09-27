"""Layer 2: the decision surface. Human ears, no game, no rebuild of anything heavy.

  python build/audition.py --demo        # see the page shape with synthesised tones
  from audition import render            # the real use: call it from the project

A page the user can act on directly: stable numbering down the left, the replacement
next to what it replaces, both playable in place. A wrong match is then obvious by ear
rather than by reading ids.

The loop this exists to serve: the user listens, quotes a number, the value changes in
mapping.py, one rebuild, refresh. Round trip in seconds. In the two Isaac mods this
absorbed every review round that would otherwise have been a game restart.

Two rules about the numbers, learned the hard way:

  * They are the interface. The user's instructions come back as "16 要更像嚎叫",
    "38只留short-18", "G1要换：3". Numbering is how they address things.
  * Once a page has been sent, its numbers are frozen. Renumbering between builds
    invalidates every instruction the user has already given.

Only the standard library. A page must never fail to build because a codec is missing.
"""

import argparse
import base64
import html
import io
import math
import struct
import sys
import wave
from pathlib import Path

FROZEN_NOTE = (
    "Numbers are frozen: they address rows for the rest of this project. "
    "Say <b>number + what to change</b> and it goes straight into the build."
)

CSS = """
:root{
  --ground:#F1F0EC; --surface:#FBFBF7; --sunken:#E7E5DE; --line:#D8D5CC;
  --ink:#1B1A17; --muted:#7C7970; --was:#6B6862; --now:#A8420E;
  --was-soft:#6B686224; --now-soft:#A8420E1F;
  --sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace;
  --shadow:0 1px 2px #1B1A170F, 0 8px 24px #1B1A170A;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#131316; --surface:#1C1C21; --sunken:#232329; --line:#2E2E35;
    --ink:#EBE9E4; --muted:#8B8880; --was:#8B8880; --now:#FF8154;
    --was-soft:#8B888024; --now-soft:#FF815422;
    --shadow:0 1px 2px #0006, 0 8px 24px #0004;
  }
}
:root[data-theme="dark"]{
  --ground:#131316; --surface:#1C1C21; --sunken:#232329; --line:#2E2E35;
  --ink:#EBE9E4; --muted:#8B8880; --was:#8B8880; --now:#FF8154;
  --was-soft:#8B888024; --now-soft:#FF815422;
  --shadow:0 1px 2px #0006, 0 8px 24px #0004;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
.page{max-width:1000px;margin:0 auto;padding:40px 24px 96px}
h1{font-size:clamp(26px,4vw,36px);font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
.lede{color:var(--muted);max-width:66ch;margin:0 0 18px}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:8px;
  padding:7px 13px;display:flex;gap:9px;align-items:baseline}
.stat b{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:16px}
.stat span{color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.08em}
.frozen{margin:18px 0 0;padding:10px 14px;border-left:3px solid var(--now);
  background:var(--now-soft);border-radius:0 8px 8px 0;font-size:13.5px}
.rows{display:flex;flex-direction:column;gap:10px;margin-top:26px}
.row{background:var(--surface);border:1px solid var(--line);border-radius:10px;
  box-shadow:var(--shadow);display:grid;grid-template-columns:auto 1fr;
  gap:2px 16px;padding:13px 16px}
.row.flagged{border-color:var(--now);background:linear-gradient(var(--now-soft),var(--now-soft)) var(--surface)}
.n{grid-row:1/4;align-self:start;font-family:var(--mono);font-variant-numeric:tabular-nums;
  font-size:19px;font-weight:600;color:var(--now);min-width:2.6ch;text-align:right;
  padding-top:1px;cursor:pointer;user-select:all}
.label{font-weight:600;letter-spacing:-.01em}
.note{color:var(--muted);font-size:13px;font-family:var(--mono)}
.pair{grid-column:2;display:flex;flex-direction:column;gap:6px;margin-top:9px}
.side{display:flex;align-items:center;gap:10px}
.tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;
  padding:2px 7px;border-radius:4px;flex-shrink:0;min-width:8.5ch;text-align:center}
.tag.was{color:var(--was);background:var(--was-soft)}
.tag.now{color:var(--now);background:var(--now-soft)}
audio{height:32px;flex:1;min-width:0}
.missing{color:var(--muted);font-size:13px;font-style:italic}
.flag{grid-row:1/4;grid-column:3;align-self:start;background:none;border:1px solid var(--line);
  color:var(--muted);border-radius:6px;font:inherit;font-size:12px;padding:3px 9px;cursor:pointer}
.flag[aria-pressed="true"]{border-color:var(--now);color:var(--now)}
.row{grid-template-columns:auto 1fr auto}
footer{margin-top:36px;color:var(--muted);font-size:13px}
kbd{font-family:var(--mono);font-size:12px;background:var(--sunken);
  border:1px solid var(--line);border-radius:4px;padding:1px 5px}
"""

JS = """
document.querySelectorAll('.flag').forEach(b=>b.addEventListener('click',()=>{
  const on = b.getAttribute('aria-pressed')!=='true';
  b.setAttribute('aria-pressed', on);
  b.closest('.row').classList.toggle('flagged', on);
  const f=[...document.querySelectorAll('.flag[aria-pressed=true]')]
    .map(x=>x.closest('.row').dataset.n);
  document.getElementById('flagged').textContent = f.length ? f.join(', ') : 'none';
}));
document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>{
  document.querySelectorAll('audio').forEach(o=>{if(o!==a)o.pause();});
}));
"""


def data_uri(blob, mime):
    """bytes or a Path -> data: URI. Everything is embedded so the page is one file
    the user can keep, and so it survives being published as an artifact."""
    if blob is None:
        return None
    if isinstance(blob, (str, Path)):
        blob = Path(blob).read_bytes()
    return f"data:{mime};base64," + base64.b64encode(blob).decode("ascii")


def _player(blob, mime, tag, css):
    uri = data_uri(blob, mime)
    if uri is None:
        return (f'<div class="side"><span class="tag {css}">{tag}</span>'
                f'<span class="missing">nothing to play</span></div>')
    if mime.startswith("image/"):
        body = f'<img src="{uri}" alt="">'
    else:
        body = f'<audio controls preload="none" src="{uri}"></audio>'
    return f'<div class="side"><span class="tag {css}">{tag}</span>{body}</div>'


def render(rows, out, title="Audition", lede="", stats=(), mime="audio/wav",
           was_label="was", now_label="now"):
    """Write the decision surface.

    rows: dicts with
        n            stable number. Assign once, never renumber.
        label        what this slot is, in the user's terms
        note         optional: which source went in, ids, durations
        original     bytes | path | None -- what is being replaced
        replacement  bytes | path | None -- what would replace it
    """
    out = Path(out)
    body = []
    for r in rows:
        n = html.escape(str(r["n"]))
        note = (f'<div class="note">{html.escape(str(r["note"]))}</div>'
                if r.get("note") else "")
        body.append(
            f'<div class="row" data-n="{n}">'
            f'<div class="n" title="click to select">{n}</div>'
            f'<div class="label">{html.escape(str(r.get("label", "")))}</div>'
            f'<button class="flag" aria-pressed="false">flag</button>'
            f'{note}'
            f'<div class="pair">'
            f'{_player(r.get("original"), mime, was_label, "was")}'
            f'{_player(r.get("replacement"), mime, now_label, "now")}'
            f'</div></div>')

    stat_html = "".join(
        f'<div class="stat"><b>{html.escape(str(v))}</b>'
        f'<span>{html.escape(str(k))}</span></div>' for k, v in stats)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"""<title>{html.escape(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap">
<style>{CSS}</style>
<div class="page">
  <header>
    <h1>{html.escape(title)}</h1>
    <p class="lede">{lede}</p>
    <div class="stats">{stat_html}</div>
    <p class="frozen">{FROZEN_NOTE}</p>
  </header>
  <main class="rows">{''.join(body)}</main>
  <footer>
    Flagged: <span id="flagged">none</span>.
    Say <kbd>number</kbd> + what to change, e.g. <kbd>16 要更像嚎叫</kbd>,
    <kbd>38 只留 short-18</kbd>, <kbd>5 从尾部缩短</kbd>.
  </footer>
</div>
<script>{JS}</script>
""", encoding="utf-8")
    return out


def _tone(freq, seconds=0.5, rate=22050, decay=6.0):
    """A short plucked tone, so --demo needs no assets and no codecs."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(int(rate * seconds)):
            t = i / rate
            v = math.sin(2 * math.pi * freq * t) * math.exp(-decay * t)
            frames += struct.pack("<h", int(v * 26000))
        w.writeframes(bytes(frames))
    return buf.getvalue()


def demo(out):
    rows = [
        {"n": 1, "label": "player hurt", "note": "clip-a  0.42s -> 0.31s",
         "original": _tone(220), "replacement": _tone(330)},
        {"n": 2, "label": "player hurt 2", "note": "clip-b  0.40s -> 0.36s",
         "original": _tone(210), "replacement": _tone(392)},
        {"n": 3, "label": "boss roar", "note": "clip-d  1.10s -> 0.88s",
         "original": _tone(110, 0.9, decay=3), "replacement": _tone(147, 0.9, decay=3)},
        {"n": 4, "label": "pickup", "note": "no candidate yet",
         "original": _tone(660, 0.25, decay=12), "replacement": None},
    ]
    return render(
        rows, out,
        title="Audition (demo)",
        lede="Scaffold demo with synthesised tones. Replace <code>rows</code> with the "
             "real assignment and this is the page the whole project runs on.",
        stats=[("sources", 6), ("targets", 6), ("ratio", "1.0:1"), ("assigned", 4)])


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--demo", action="store_true",
                    help="render a demo page with synthesised tones")
    ap.add_argument("-o", "--out", default="data/audition.html")
    args = ap.parse_args()
    if not args.demo:
        sys.exit("audition.py is a library: call render(rows, out) from the project.\n"
                 "To see the page shape first:  python build/audition.py --demo")
    print("wrote", demo(args.out))
