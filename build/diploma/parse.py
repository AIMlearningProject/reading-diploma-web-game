"""Step 2 of the pipeline: turn the six PDFs in cache/ into entries.json.

Layout of the source PDFs (measured, not assumed -- see the numbers below):

  * Two columns at fixed tab stops: author at x0 ~57, titles at x0 ~187.1.
  * A category heading is a BOLD line that lives entirely in the left column.
  * Explanatory prose (the intro, and the notes under some headings) also starts
    at x0 ~57 but simply flows across x=180, so the gap between the last word of
    the left column and the first word of the right column is ~3pt. In a real
    two-column row that gap is 34-75pt. GAP_MIN separates the two.
  * A row with no author is either a continuation of the previous row's titles
    or a title-only entry (a book series with no author). Continuations sit ~14pt
    below their row, separate entries ~21pt. LINE_GAP_MAX separates the two.

Run after fetch.py:

    python parse.py
"""

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

HERE = Path(__file__).parent
CACHE = HERE / 'cache'
SOURCES = HERE / 'sources.json'
ENTRIES = HERE / 'entries.json'

COL_X = 180.0        # boundary between the author column and the title column
TAB_X = 187.13       # the title column's tab stop, identical in all six PDFs
TAB_TOL = 0.25       # prose never starts this close to it; the nearest is 0.41 away
GAP_MIN = 15.0       # a left-to-right gap this wide can only be two columns
LINE_GAP_MAX = 16.0  # max vertical gap for a title-only line to be a continuation

# Words that may appear lowercase inside an author cell.
NAME_PARTICLES = {'ja', '&', 'von', 'van', 'af', 'de', 'del', 'di', 'du', 'la', 'le', 'den', 'der'}

GRADE_TITLE = re.compile(r'^\d\.\s*(ja\s*\d\.\s*)?luokka\s*$', re.I)
TAI_SPLIT = re.compile(r'\s+tai\s+', re.I)

# A title alternative that does not name one specific book. These are the rows
# the customer has to rule on: "jokin muu Yon talo -sarjan kirja" means "any
# other book in that series", which the game cannot bind to a single record.
VAGUE = re.compile(
    r'jokin\b|-?sarja|sarjan\b|-kirjat\b|-kirja\b|kirjoista\b|'
    r'kirjailijan\b|kirjaa\b|muu\b',
    re.I,
)

# An author cell looks like "Surname, Firstname" / "Surname, P. C.".
AUTHORISH = re.compile(r'^[^\d]{2,40},\s*\S')


def lines_of(page):
    """Group a page's words into visual lines, keyed by rounded top."""
    buckets = defaultdict(list)
    for w in page.extract_words(extra_attrs=['fontname', 'size']):
        buckets[round(w['top'])].append(w)
    for top in sorted(buckets):
        words = sorted(buckets[top], key=lambda w: w['x0'])
        left = [w for w in words if w['x0'] < COL_X]
        right = [w for w in words if w['x0'] >= COL_X]
        yield {
            'top': top,
            # All words bold -> a heading. The intro paragraph has a few bold
            # words inside it, so `any` would swallow the intro as a heading.
            'bold': all('Bold' in w['fontname'] for w in words),
            'left': ' '.join(w['text'] for w in left).strip(),
            'right': ' '.join(w['text'] for w in right).strip(),
            'gap': (right[0]['x0'] - left[-1]['x1']) if left and right else None,
            'rx0': right[0]['x0'] if right else None,
            'text': ' '.join(w['text'] for w in words).strip(),
        }


def looks_like_author(text):
    """Is this left-hand cell a name rather than running prose?

    Needed because geometry alone cannot tell them apart: when an author's name
    is long the title is pushed past the tab stop and starts one space later,
    exactly like a prose line that happens to cross the column boundary
    ("Stevenson, Robert Louis | Aarresaari" sits 3.5pt apart, same as the intro
    paragraph). A name is capitalised throughout; a sentence fragment is not.
    """
    text = re.sub(r'\([^)]*\)?', '', text).strip().strip('.,;:')  # drop "(toim.)"
    words = text.split()
    if not words or len(words) > 6 or len(text) > 45:
        return False
    for word in words:
        bare = word.strip('.,;:&')
        if not bare or word.lower().strip('.,') in NAME_PARTICLES:
            continue
        if not bare[0].isupper():
            return False
    return True


def split_titles(blob):
    """Split a title cell into concrete titles and vague 'any book in X' notes."""
    concrete, vague = [], []
    for part in TAI_SPLIT.split(blob):
        part = part.strip().strip(',').strip()
        if not part:
            continue
        (vague if VAGUE.search(part) else concrete).append(part)
    return concrete, vague


def is_heading(ln):
    """A category heading: fully bold, and not a two-column book row.

    Long headings wrap past the column boundary ("3. Suosikkeja vuosikymmenten |
    takaa"), so they do have a right cell -- but as flowing prose, with a ~3pt
    gap rather than the 34-75pt gap of a real two-column row.
    """
    if not ln['bold']:
        return False
    if ln['gap'] is not None and ln['gap'] >= GAP_MIN:
        return False
    return not GRADE_TITLE.match(ln['text'])


def parse_pdf(path, grade):
    entries = []
    intro = []
    notes = defaultdict(list)  # category -> explanatory prose under it
    current = None
    prev_top = None
    prev_page = None

    with pdfplumber.open(path) as pdf:
        pages = [list(lines_of(page)) for page in pdf.pages]

    # Pass 1: collect every heading first, so pass 2 can recognise the copy of
    # the next heading that the PDF echoes into the right column at a page break.
    categories = []
    for page in pages:
        for ln in page:
            if is_heading(ln) and ln['text'] not in categories:
                categories.append(ln['text'])

    # Pass 2: walk the rows.
    for page_no, page in enumerate(pages, start=1):
        for ln in page:
            # A line holds an author and a title -- rather than one prose
            # sentence spilling across the column boundary -- if the two cells
            # are far apart, or the title sits exactly on the tab stop, or the
            # left cell reads as a name.
            two_col = ln['gap'] is not None and (
                ln['gap'] >= GAP_MIN
                or abs(ln['rx0'] - TAB_X) < TAB_TOL
                or looks_like_author(ln['left'])
            )

            if is_heading(ln):
                current = ln['text']
                prev_top = None
                continue

            if not ln['right']:
                continue

            # Flowing prose: the intro before the first heading, or a note
            # under a heading. Never a book.
            if ln['left'] and not two_col:
                (intro if current is None else notes[current]).append(ln['text'])
                continue

            if current is None:
                intro.append(ln['text'])
                continue

            # The next heading, echoed into the right column at a page break
            # (seen at the foot of 1.-2.-luokka page 2, where it also wraps).
            if not ln['left'] and any(ln['right'] in c for c in categories):
                continue

            if ln['left']:
                entries.append({
                    'grade': grade,
                    'category': current,
                    'page': page_no,
                    'author': ln['left'],
                    'title_blob': ln['right'],
                })
            elif entries:
                same_page = prev_page == page_no
                gap = (ln['top'] - prev_top) if (same_page and prev_top is not None) else None
                # A wrapped title usually sits closer to its row than the next
                # entry does, but not always: in a run of author-less rows the
                # spacing is identical either way. A title never begins with a
                # lowercase letter, so that settles the remaining cases.
                wrapped = ln['right'][:1].islower() or (gap is not None and gap <= LINE_GAP_MAX)
                if wrapped and same_page:
                    entries[-1]['title_blob'] += ' ' + ln['right']  # wrapped line
                else:
                    entries.append({
                        'grade': grade,
                        'category': current,
                        'page': page_no,
                        'author': None,
                        'title_blob': ln['right'],
                    })
            prev_top = ln['top']
            prev_page = page_no

    return entries, categories, intro, {k: ' '.join(v) for k, v in notes.items()}


def main():
    if not SOURCES.exists():
        sys.exit('FAIL: sources.json is missing -- run fetch.py first')
    src = json.loads(SOURCES.read_text(encoding='utf-8'))

    all_entries = []
    per_grade = {}
    for f in src['files']:
        path = CACHE / f'{f["basename"]}.pdf'
        entries, categories, intro, notes = parse_pdf(path, f['grade'])

        for e in entries:
            blob = re.sub(r'\s+', ' ', e.pop('title_blob')).strip()
            author = e['author']
            e['author_unparsed'] = None
            if author and not AUTHORISH.match(author):
                # No "Surname, Firstname" comma. Either a mononym author
                # ("Mariska") or the title simply started in the left column.
                # Fold it into the title and flag it for the data-quality sheet.
                blob = f'{author} {blob}'.strip()
                e['author'] = None
                e['author_unparsed'] = author
            concrete, vague = split_titles(blob)
            e['title_as_printed'] = blob
            e['concrete_titles'] = concrete
            e['series_note'] = ' / '.join(vague) if vague else None
            e['is_ambiguous'] = bool(vague) or not concrete
            key = f'{e["grade"]}|{e["category"]}|{e["author"] or ""}|{blob}'
            e['external_key'] = hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]

        per_grade[f['grade']] = {
            'categories': categories,
            'intro': ' '.join(intro),
            'category_notes': notes,
            'count': len(entries),
        }
        all_entries.extend(entries)

    # Frozen ids, assigned in document order. The customer answers by id.
    for i, e in enumerate(all_entries, start=1):
        e['id'] = i

    dupes = len(all_entries) - len({e['external_key'] for e in all_entries})
    ENTRIES.write_text(
        json.dumps({'grades': per_grade, 'entries': all_entries}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )

    amb = sum(1 for e in all_entries if e['is_ambiguous'])
    noauth = sum(1 for e in all_entries if not e['author'])
    print(f'{"grade":>6} {"cats":>5} {"entries":>8} {"ambiguous":>10} {"no author":>10}')
    for g, d in per_grade.items():
        ga = sum(1 for e in all_entries if e['grade'] == g and e['is_ambiguous'])
        gn = sum(1 for e in all_entries if e['grade'] == g and not e['author'])
        print(f'{g:>6} {len(d["categories"]):>5} {d["count"]:>8} {ga:>10} {gn:>10}')
    print(f'{"TOTAL":>6} {sum(len(d["categories"]) for d in per_grade.values()):>5} '
          f'{len(all_entries):>8} {amb:>10} {noauth:>10}')
    if dupes:
        print(f'\n  ! {dupes} duplicate external_key(s)')
    print('\nwrote entries.json')


if __name__ == '__main__':
    main()
