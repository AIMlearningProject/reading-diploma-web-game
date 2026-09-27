"""Final step of the pipeline: entries.json + mapping.py -> the seed's JSON.

    python emit.py

Writes backend/db/seeds/data/diploma_books.json, which is committed and loaded
by backend/db/seeds/00_diploma_books.js. The backend never parses a PDF and
gains no dependency from any of this.

Refuses to write if mapping.validate() finds a problem, so a republished list
that no longer matches the continent map fails here rather than in the game.
"""

import json
import sys
from pathlib import Path

import mapping

HERE = Path(__file__).parent
ENTRIES = HERE / 'entries.json'
SOURCES = HERE / 'sources.json'
OUT = HERE.parent.parent / 'backend' / 'db' / 'seeds' / 'data' / 'diploma_books.json'

TITLE_MAX = 255  # books.title is varchar(255)


def main():
    if not ENTRIES.exists():
        sys.exit('FAIL: entries.json is missing -- run parse.py first')
    data = json.loads(ENTRIES.read_text(encoding='utf-8'))
    src = json.loads(SOURCES.read_text(encoding='utf-8'))
    entries, per_grade = data['entries'], data['grades']

    problems = mapping.validate(per_grade)
    if problems:
        print('FAIL: mapping.py no longer matches the published lists:')
        for p in problems:
            print('  -', p)
        sys.exit(1)

    # What each continent shows for each grade.
    continents = []
    for key, name, stands_for in mapping.CONTINENTS:
        grades = {}
        for g in mapping.GRADES:
            cats = mapping.DRAFT[key][g]
            grades[g] = {
                'categories': cats,
                'label': ' / '.join(cats) if cats else mapping.FREE_CHOICE_LABEL,
                'free': not cats,
            }
        continents.append({
            'key': key,
            'name': name,
            'stands_for': stands_for,
            'grades': grades,
        })

    books = []
    overlong = []
    for e in entries:
        concrete = e['concrete_titles']
        # The pupil has to say which book they read unless the row names exactly
        # one. That covers both "A tai B" and "any other book in the series".
        needs_input = len(concrete) != 1 or bool(e['series_note'])
        if mapping.AMBIGUOUS_HANDLING != 'ask':
            sys.exit(f'FAIL: AMBIGUOUS_HANDLING={mapping.AMBIGUOUS_HANDLING!r} is not implemented yet')

        title = e['title_as_printed']
        if len(title) > TITLE_MAX:
            overlong.append(e['id'])
            title = title[:TITLE_MAX - 1].rstrip() + '…'

        books.append({
            'external_key': e['external_key'],
            'grade_band': e['grade'],
            'category': e['category'],
            'map_key': mapping.continent_for(e['grade'], e['category']),
            'author': e['author'] or '',
            'title': title,
            'alt_titles': concrete,
            'series_note': e['series_note'],
            'needs_title_input': needs_input,
        })

    # external_key is the seed's upsert key, so collisions would silently drop
    # rows. The source lists a couple of entries twice; keep the first.
    seen = {}
    deduped = []
    for b in books:
        if b['external_key'] in seen:
            seen[b['external_key']] += 1
            continue
        seen[b['external_key']] = 1
        deduped.append(b)
    dropped = len(books) - len(deduped)

    payload = {
        'source': src['source'],
        'source_files': [{k: f[k] for k in ('grade', 'url', 'sha256')} for f in src['files']],
        'pending_decisions': {
            'Q1_ambiguous_handling': mapping.AMBIGUOUS_HANDLING,
            'Q2_continent_map': 'draft',
            'Q3_books_required': mapping.BOOKS_REQUIRED,
            'Q4_grade_1_2_groups': mapping.GRADE_1_2_GROUPS,
        },
        'free_choice_label': mapping.FREE_CHOICE_LABEL,
        'continents': continents,
        'books': deduped,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding='utf-8')

    by_grade = {}
    for b in deduped:
        by_grade.setdefault(b['grade_band'], []).append(b)
    print(f'{"grade":>6} {"books":>6} {"need a title from the pupil":>28} {"free continents":>16}')
    for g in mapping.GRADES:
        rows = by_grade.get(g, [])
        need = sum(1 for b in rows if b['needs_title_input'])
        free = sum(1 for k in mapping.DRAFT if not mapping.DRAFT[k][g])
        print(f'{g:>6} {len(rows):>6} {need:>28} {free:>16}')
    print(f'{"TOTAL":>6} {len(deduped):>6} '
          f'{sum(1 for b in deduped if b["needs_title_input"]):>28}')
    if dropped:
        print(f'\n  dropped {dropped} row(s) duplicated in the source PDFs')
    if overlong:
        print(f'  truncated {len(overlong)} title(s) to {TITLE_MAX} chars: {overlong}')
    print(f'\nwrote {OUT.relative_to(HERE.parent.parent)}')


if __name__ == '__main__':
    main()
