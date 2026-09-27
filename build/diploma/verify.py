"""Every constraint that has to hold across the whole catalogue, as a check.

    python verify.py            # exit code != 0 fails the build
    python verify.py --accept   # adopt the current counts as the new baseline

Each check here exists because the pipeline got it wrong once. Reading 500 rows
out of a hand-made PDF is a pile of judgement calls, and the way they go wrong
is quiet: a row is dropped, or a sentence from the intro becomes a book. None of
that is visible by eye in a list this long, so it is all mechanical.

expected.json is the baseline. When the library republishes a list the counts
will move, which is the point: the run fails, a human looks at what changed, and
--accept records the new numbers.
"""

import json
import sys
from collections import Counter
from pathlib import Path

import mapping

HERE = Path(__file__).parent
ENTRIES = HERE / 'entries.json'
SOURCES = HERE / 'sources.json'
EXPECTED = HERE / 'expected.json'

# The source lists the same three series twice under one heading in 1.-2.-luokka
# (once below Huovi, once below Korhonen). Confirmed against the PDF, raised
# with the library in sheet 06 of the questionnaire.
KNOWN_DUPLICATE_KEYS = 2


def check(problems, ok, message):
    if not ok:
        problems.append(message)


def main():
    accept = '--accept' in sys.argv
    problems = []

    if not ENTRIES.exists() or not SOURCES.exists():
        sys.exit('FAIL: run fetch.py and parse.py first')

    data = json.loads(ENTRIES.read_text(encoding='utf-8'))
    src = json.loads(SOURCES.read_text(encoding='utf-8'))
    entries, per_grade = data['entries'], data['grades']
    expected = json.loads(EXPECTED.read_text(encoding='utf-8')) if EXPECTED.exists() else None

    # --- sources -------------------------------------------------------------
    check(problems, len(src['files']) == len(mapping.GRADES),
          f'sources.json has {len(src["files"])} lists, expected {len(mapping.GRADES)}')
    for f in src['files']:
        check(problems, len(f.get('sha256', '')) == 64, f'{f["basename"]}: no sha256 recorded')

    # --- ids -----------------------------------------------------------------
    ids = [e['id'] for e in entries]
    check(problems, ids == list(range(1, len(entries) + 1)),
          'ids are not a contiguous 1..N run; the customer answers by id, so they must not shift')

    # --- structure of every row ---------------------------------------------
    for e in entries:
        where = f'#{e["id"]} ({e["grade"]}, {e["category"]!r})'
        check(problems, bool(e['concrete_titles']) or bool(e['series_note']),
              f'{where}: no title and no series note')
        # Prose leaking out of the intro would land here as a lowercase fragment.
        check(problems, not e['title_as_printed'][:1].islower(),
              f'{where}: title starts lowercase, so it is a wrapped line, not a row: '
              f'{e["title_as_printed"][:60]!r}')
        check(problems, e['category'] in per_grade[e['grade']]['categories'],
              f'{where}: category is not one of its grade\'s headings')
        check(problems, len(e['title_as_printed']) <= 255,
              f'{where}: title is longer than the books.title column')

    dupes = len(entries) - len({e['external_key'] for e in entries})
    check(problems, dupes == KNOWN_DUPLICATE_KEYS,
          f'{dupes} duplicate external_key(s), expected exactly {KNOWN_DUPLICATE_KEYS}')

    # --- every grade parsed into something ----------------------------------
    for grade in mapping.GRADES:
        check(problems, grade in per_grade, f'grade {grade}: missing from entries.json')
        if grade not in per_grade:
            continue
        check(problems, len(per_grade[grade]['intro']) > 50,
              f'grade {grade}: the intro paragraph is empty, so prose was read as rows instead')
        check(problems, per_grade[grade]['count'] > 0, f'grade {grade}: no rows')

    # --- the continent map --------------------------------------------------
    problems.extend(mapping.validate(per_grade))

    # --- counts against the baseline ----------------------------------------
    counts = {
        'entries': len(entries),
        'categories': sum(len(d['categories']) for d in per_grade.values()),
        'ambiguous': sum(1 for e in entries if e['is_ambiguous']),
        'per_grade': {g: per_grade[g]['count'] for g in mapping.GRADES if g in per_grade},
        'categories_per_grade': {
            g: len(per_grade[g]['categories']) for g in mapping.GRADES if g in per_grade
        },
    }
    if expected and not accept:
        for key in ('entries', 'categories', 'ambiguous'):
            check(problems, counts[key] == expected[key],
                  f'{key}: {counts[key]}, baseline says {expected[key]} '
                  f'-- check what changed, then re-run with --accept')
        for grade, n in counts['per_grade'].items():
            check(problems, n == expected['per_grade'].get(grade),
                  f'grade {grade}: {n} rows, baseline says {expected["per_grade"].get(grade)}')
        for grade, n in counts['categories_per_grade'].items():
            check(problems, n == expected['categories_per_grade'].get(grade),
                  f'grade {grade}: {n} groups, baseline says '
                  f'{expected["categories_per_grade"].get(grade)}')

    # --- report -------------------------------------------------------------
    if problems:
        print(f'FAIL: {len(problems)} problem(s)')
        for p in problems[:40]:
            print('  -', p)
        if len(problems) > 40:
            print(f'  ... and {len(problems) - 40} more')
        sys.exit(1)

    if accept or not expected:
        EXPECTED.write_text(json.dumps(counts, indent=2), encoding='utf-8')
        print(f'baseline written to {EXPECTED.name}')

    by_cat = Counter(e['category'] for e in entries)
    print(f'OK  {counts["entries"]} rows, {counts["categories"]} groups, '
          f'{counts["ambiguous"]} ambiguous, '
          f'smallest group {min(by_cat.values())} rows, largest {max(by_cat.values())}')


if __name__ == '__main__':
    main()
