"""Step 3 of the pipeline: build the open-questions workbook for the customer.

The reading diploma's book lists carry decisions only the library can make:
which continent a category belongs on, what "any other book in the series"
should mean inside a game, and whether finishing the game has to equal
finishing the diploma. This writes those questions out as a spreadsheet the
library fills in and sends back.

    python questions.py

Ids come from entries.json and are frozen: the customer answers by id, so a
re-parse must never renumber. verify.py enforces that.
"""

import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).parent
ENTRIES = HERE / 'entries.json'
SOURCES = HERE / 'sources.json'
OUT = HERE / 'out' / 'Lukudiplomi_open_questions.xlsx'

# --- house style -------------------------------------------------------------

NAVY = '1E3A5F'
GOLD = 'C4973A'
ASK_FILL = PatternFill('solid', fgColor='FFF6DC')    # cells the customer fills
DATA_FILL = PatternFill('solid', fgColor='F4F6FA')   # read-only source data
HEAD_FILL = PatternFill('solid', fgColor=NAVY)
HEAD_FONT = Font(color='FFFFFF', bold=True, size=11)
TITLE_FONT = Font(color=NAVY, bold=True, size=15)
NOTE_FONT = Font(color='555555', italic=True, size=10)
THIN = Side(style='thin', color='D8D8D8')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical='top')
TOP = Alignment(vertical='top')

# The continent map and the grade bands live in mapping.py, which is the one
# place any of this is decided.
from mapping import CONTINENTS, DRAFT, GRADES, validate as validate_mapping  # noqa: E402


HANDLING = [
    'A - one entry and the pupil types the title they read',
    'B - expand into a fixed list of titles (give them in the next column)',
    'C - drop this entry from the game',
    'D - other (explain in Notes)',
]

RUN_SCOPE = [
    'A - one school year (grades 1-9 = nine runs)',
    'B - one grade band (1-2 / 3-4 / 5-6 / 7 / 8 / 9 = six runs)',
    'C - other (explain in Notes)',
]

ALL_CONTINENTS = [
    'A - yes: all eight',
    'B - no: a run is fewer continents (say how many)',
    'C - other (explain in Notes)',
]

SIXTH_GRADE_RULE = [
    'A - yes: steer them to groups they have not used',
    'B - no: a reminder is enough',
    'C - not needed',
]

WIDER_DIPLOMAS = [
    'A - yes: show them as a longer-term reward',
    'B - no',
    'C - other (explain in Notes)',
]

G12_OPTIONS = [
    'A - show the group names exactly as printed',
    'B - merge the three reading-level groups into one',
    'C - replace them with genre groups (give them in Notes)',
    'D - other (explain in Notes)',
]


# --- helpers -----------------------------------------------------------------


def sheet(wb, name, title, blurb):
    ws = wb.create_sheet(name)
    ws['A1'] = title
    ws['A1'].font = TITLE_FONT
    ws['A2'] = blurb
    ws['A2'].font = NOTE_FONT
    ws.freeze_panes = 'A5'
    return ws


def header(ws, row, labels, widths):
    for i, (label, width) in enumerate(zip(labels, widths), start=1):
        c = ws.cell(row=row, column=i, value=label)
        c.fill, c.font, c.border, c.alignment = HEAD_FILL, HEAD_FONT, BOX, WRAP
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[row].height = 30


def put(ws, row, col, value, ask=False, wrap=False):
    c = ws.cell(row=row, column=col, value=value)
    c.fill = ASK_FILL if ask else DATA_FILL
    c.border = BOX
    c.alignment = WRAP if wrap else TOP
    return c


def dropdown(ws, options, col, first, last):
    # Excel's inline list is comma-separated, so no option may contain a comma.
    assert not any(',' in o for o in options), options
    dv = DataValidation(
        type='list',
        formula1='"{}"'.format(','.join(options)),
        allow_blank=True,
        showDropDown=False,
    )
    ws.add_data_validation(dv)
    dv.add(f'{col}{first}:{col}{last}')


# --- sheets ------------------------------------------------------------------


def sheet_readme(wb, src, per_grade, totals):
    ws = wb.create_sheet('00_README')
    ws.column_dimensions['A'].width = 4
    ws.column_dimensions['B'].width = 108
    rows = [
        ('t', 'Kirja kantaa -lukudiplomi: open questions for the game'),
        ('n', 'Ylivieska reading-diploma web game / Centria Capstone project'),
        ('', ''),
        ('h', 'What this is'),
        ('p', 'We are building a reading game for schools around the Kirja kantaa reading '
              'diploma. The game reads your published book lists directly, so the lists stay '
              'yours and stay in one place. A few things in the lists cannot be turned into '
              'game content without a decision from the library. Those decisions are in this '
              'file.'),
        ('', ''),
        ('h', 'Where the data came from'),
        ('p', f"Page: {src['source']['page_link']}"),
        ('p', f"Read automatically on {src['source']['page_modified'][:10]} "
              f"from the six grade PDFs linked there."),
        ('p', f"{totals['entries']} rows across {totals['categories']} groups and "
              f"{len(GRADES)} grade bands were read. Nothing was translated: every book "
              f"title, author and group name below is exactly as printed in your PDFs."),
        ('', ''),
        ('h', 'How to fill this in'),
        ('p', 'Only the cream-coloured cells need your input. Grey cells are our source data '
              'and can be left alone. Most answer cells have a drop-down; where none fits, '
              'pick the "other" option and write in the Notes column.'),
        ('p', 'Please do not insert, delete or re-sort rows. The ID column is how your answers '
              'are matched back to the book list, so the numbering has to stay as it is.'),
        ('p', 'Partial answers are useful. If a sheet is too much, sheet 03 is the one that '
              'decides most of what we build next, and sheet 01 is the largest.'),
        ('', ''),
        ('h', 'The sheets'),
        ('l', f"01_Ambiguous_entries   {totals['ambiguous']} rows that name a series or no "
              f"book at all. Counting the rows that offer a choice between named books, "
              f"{totals['needs_title']} of {totals['entries']} do not point at one title."),
        ('l', '02_Continent_map       The game has 8 continents and each should stand for one '
              'kind of book. Which of your groups belongs on which continent?'),
        ('l', '03_Progression         Five questions about how one journey through the map '
              'lines up with the diploma. The most important sheet for us.'),
        ('l', '04_Grade_1_2_groups    Three of the grade 1-2 groups are about reading level '
              'rather than subject, which does not map onto a continent.'),
        ('l', f"05_All_entries         All {totals['entries']} rows, for reference. Please tell "
              f"us if anything is missing or misread."),
        ('l', '06_Data_quality        {n} small oddities we noticed in the '
              'PDFs (duplicate rows, a stray dash). Confirm or correct.'),
        ('', ''),
        ('h', 'Returning it'),
        ('p', 'Save and send the file back as it is. We import your answers directly, so there '
              'is no need to tidy or reformat anything.'),
    ]
    r = 2
    for kind, text in rows:
        c = ws.cell(row=r, column=2, value=text)
        if kind == 't':
            c.font = TITLE_FONT
        elif kind == 'h':
            c.font = Font(color=GOLD, bold=True, size=12)
        elif kind == 'n':
            c.font = NOTE_FONT
        else:
            c.alignment = Alignment(wrap_text=True, vertical='top')
            ws.row_dimensions[r].height = 15 * (1 + len(text) // 100)
        r += 1
    return ws


def sheet_ambiguous(wb, entries):
    amb = [e for e in entries if e['is_ambiguous']]
    ws = sheet(
        wb, '01_Ambiguous_entries',
        'Q1. Rows that do not name one single book',
        'These rows offer a choice or a whole series, so the game cannot store them as one '
        'book. Tell us how each should behave. Column G and onward are yours.',
    )
    header(
        ws, 4,
        ['ID', 'Grade', 'Group', 'Author', 'As printed in the PDF', 'What is unclear',
         'How should the game handle it?', 'If B: the titles to use',
         'Notes'],
        [6, 7, 26, 20, 46, 30, 34, 40, 30],
    )
    r = 5
    for e in amb:
        if e['concrete_titles'] and e['series_note']:
            unclear = 'Names a book and also allows any other book in a series.'
        elif e['series_note']:
            unclear = 'Names a series only, no single book.'
        else:
            unclear = 'No title could be read from this row.'
        put(ws, r, 1, e['id'])
        put(ws, r, 2, e['grade'])
        put(ws, r, 3, e['category'], wrap=True)
        put(ws, r, 4, e['author'] or '', wrap=True)
        put(ws, r, 5, e['title_as_printed'], wrap=True)
        put(ws, r, 6, unclear, wrap=True)
        put(ws, r, 7, '', ask=True, wrap=True)
        put(ws, r, 8, '', ask=True, wrap=True)
        put(ws, r, 9, '', ask=True, wrap=True)
        r += 1
    dropdown(ws, HANDLING, 'G', 5, r - 1)
    ws.auto_filter.ref = f'A4:I{r - 1}'
    return len(amb)


def sheet_map(wb, per_grade):
    ws = sheet(
        wb, '02_Continent_map',
        'Q2. Which group belongs on which continent?',
        'The game world has 8 continents. Each should stand for one kind of book, so that a '
        'pupil picking "Antarctica" knows what they will find there. Our draft is in the grey '
        'cells - please correct it in the cream ones. A continent left empty simply lets the '
        'pupil pick any book from that grade.',
    )
    labels = ['Continent', 'What we suggest it stands for']
    widths = [16, 28]
    for g in GRADES:
        labels += [f'Grade {g}: our draft', f'Grade {g}: your answer']
        widths += [34, 34]
    header(ws, 4, labels, widths)

    r = 5
    for key, name, stands_for in CONTINENTS:
        put(ws, r, 1, name)
        put(ws, r, 2, stands_for, wrap=True)
        col = 3
        for g in GRADES:
            cats = DRAFT[key][g]
            put(ws, r, col, ' + '.join(cats) if cats else '(free choice)', wrap=True)
            put(ws, r, col + 1, '', ask=True, wrap=True)
            col += 2
        ws.row_dimensions[r].height = 34
        r += 1

    r += 2
    ws.cell(row=r, column=1, value='The groups, as printed in each PDF').font = Font(
        color=GOLD, bold=True, size=12)
    r += 1
    header(ws, r, ['Grade', 'Group as printed in the PDF', 'Books in this group',
                   'Our draft continent', 'Your answer'],
           [7, 46, 18, 20, 24])
    r += 1
    first = r
    for g in GRADES:
        for cat in per_grade[g]['categories']:
            where = next((n for k, n, _ in CONTINENTS if cat in DRAFT[k][g]), '(none)')
            put(ws, r, 1, g)
            put(ws, r, 2, cat, wrap=True)
            put(ws, r, 3, per_grade[g]['category_counts'][cat])
            put(ws, r, 4, where)
            put(ws, r, 5, '', ask=True, wrap=True)
            r += 1
    dropdown(ws, [n for _, n, _ in CONTINENTS] + ['(free choice)'], 'E', first, r - 1)


def sheet_progression(wb, per_grade):
    ws = sheet(
        wb, '03_Progression',
        'Q3. How one journey through the map lines up with the diploma',
        'These five answers decide more of the build than anything else we have asked. '
        'The reference table underneath is what your own lists say, for comparison.',
    )
    header(
        ws, 4,
        ['#', 'Question', 'Why we are asking', 'Your answer', 'If a number or "other"', 'Notes'],
        [4, 54, 62, 44, 26, 32],
    )

    questions = [
        (
            'Is one journey through the map one school year or one grade band?',
            'Your page says pupils complete that grade\u2019s diploma each year and that each '
            'one is its own performance, so we read this as one journey per school year. '
            'Grades 1 and 2 would then read the same list twice, which the list itself seems '
            'to expect, since it sets different rules for the two years.',
            RUN_SCOPE
        ),
        (
            'Must a pupil visit all eight continents in one journey?',
            'The map has eight continents, so even one book each comes to eight. The 1-2 list '
            'asks for five to six books, so for the younger years the map is already larger '
            'than the diploma.',
            ALL_CONTINENTS
        ),
        (
            'How many books should one continent hold?',
            'Four today, which makes a full map 32 books. One practical ceiling: the smallest '
            'group we placed on a continent has six books, so a continent cannot ask for more '
            'than six without a pupil running out of choices.',
            None
        ),
        (
            'Should the game steer a sixth-grader away from the groups they used in fifth grade?',
            'The 5-6 list asks sixth-graders to choose from the groups they did not read from '
            'in fifth grade. For the game to do that, a journey has to remember the previous '
            'year\u2019s choices, which is a change we would rather design in than add later.',
            SIXTH_GRADE_RULE
        ),
        (
            'Should the wider 1-6 and 7-9 kirjallisuusdiplomi appear in the game?',
            'Completing every year of a stage earns the wider diploma. Nothing in the game '
            'marks that yet, and it would fit a longer-term reward.',
            WIDER_DIPLOMAS
        ),
    ]

    r = 5
    for i, (question, why, options) in enumerate(questions, start=1):
        put(ws, r, 1, i)
        put(ws, r, 2, question, wrap=True)
        put(ws, r, 3, why, wrap=True)
        put(ws, r, 4, '', ask=True, wrap=True)
        put(ws, r, 5, '', ask=True, wrap=True)
        put(ws, r, 6, '', ask=True, wrap=True)
        if options:
            dropdown(ws, options, 'D', r, r)
        ws.row_dimensions[r].height = 62
        r += 1

    r += 2
    ws.cell(row=r, column=1, value='What your lists say, for reference').font = Font(
        color=GOLD, bold=True, size=12)
    r += 1
    header(ws, r, ['Grade', 'What the PDF says', 'Books it asks for', 'Continents in the game'],
           [7, 78, 18, 20])
    r += 1
    for g in GRADES:
        put(ws, r, 1, g)
        put(ws, r, 2, per_grade[g]['intro'], wrap=True)
        put(ws, r, 3, per_grade[g]['books_required'] or '(please confirm)', wrap=True)
        put(ws, r, 4, 8)
        ws.row_dimensions[r].height = 46
        r += 1


def sheet_g12(wb, per_grade):
    ws = sheet(
        wb, '04_Grade_1_2_groups',
        'Q4. Three grade 1-2 groups describe reading level, not subject',
        'Kuvakirjoja, Ta-vu-tet-tu-ja kir-jo-ja and Helppolukuisia kirjoja say how hard a book '
        'is to read rather than what it is about. Putting them on a continent that stands for a '
        'subject would be misleading. How would you like the game to present them?',
    )
    header(ws, 4, ['Group as printed', 'Books in it', 'What it describes', 'Your answer', 'Notes'],
           [34, 12, 22, 46, 34])
    r = 5
    for cat in per_grade['1-2']['categories']:
        kind = ('reading level' if cat in (
            'Kuvakirjoja', 'Ta-vu-tet-tu-ja kir-jo-ja', 'Helppolukuisia kirjoja')
            else 'subject')
        put(ws, r, 1, cat, wrap=True)
        put(ws, r, 2, per_grade['1-2']['category_counts'][cat])
        put(ws, r, 3, kind)
        put(ws, r, 4, '', ask=True, wrap=True)
        put(ws, r, 5, '', ask=True, wrap=True)
        r += 1
    dropdown(ws, G12_OPTIONS, 'D', 5, r - 1)
    r += 1
    ws.cell(row=r, column=1,
            value='One answer for all three is fine - just put it on the first row.'
            ).font = NOTE_FONT


def sheet_all(wb, entries):
    ws = sheet(
        wb, '05_All_entries',
        'Every row we read from your PDFs',
        'For reference and checking. If a row is missing, wrong or should not be in the game, '
        'say so in the last column.',
    )
    header(
        ws, 4,
        ['ID', 'Grade', 'Group', 'PDF page', 'Author', 'As printed in the PDF',
         'Single books we read from it', 'Series / "any other book" part', 'Anything wrong?'],
        [6, 7, 26, 9, 20, 46, 40, 34, 28],
    )
    r = 5
    for e in entries:
        put(ws, r, 1, e['id'])
        put(ws, r, 2, e['grade'])
        put(ws, r, 3, e['category'], wrap=True)
        put(ws, r, 4, e['page'])
        put(ws, r, 5, e['author'] or '', wrap=True)
        put(ws, r, 6, e['title_as_printed'], wrap=True)
        put(ws, r, 7, ' | '.join(e['concrete_titles']), wrap=True)
        put(ws, r, 8, e['series_note'] or '', wrap=True)
        put(ws, r, 9, '', ask=True, wrap=True)
        r += 1
    ws.auto_filter.ref = f'A4:I{r - 1}'


def sheet_quality(wb, entries):
    ws = sheet(
        wb, '06_Data_quality',
        'Small oddities we noticed in the PDFs',
        'None of these block us. We are listing them because they look like slips in the source '
        'files rather than choices, and you may want to fix them in the published PDFs too.',
    )
    header(ws, 4, ['#', 'Grade', 'What we noticed', 'The rows involved', 'Is this intended?', 'Notes'],
           [5, 7, 46, 52, 22, 34])

    issues = []

    by_key = {}
    for e in entries:
        by_key.setdefault(e['external_key'], []).append(e)
    for group in by_key.values():
        if len(group) > 1:
            e = group[0]
            issues.append((
                e['grade'],
                f'The same entry is printed twice in the group "{e["category"]}".',
                ' / '.join(f'#{x["id"]} {x["title_as_printed"]}' for x in group),
            ))

    dash = [e for e in entries if '–sarja' in e['title_as_printed']]
    for e in dash:
        issues.append((
            e['grade'],
            'Written with an en dash ("–sarja") where the rest of the list uses a hyphen '
            '("-sarja").',
            f'#{e["id"]} {e["title_as_printed"]}',
        ))

    unparsed = [e for e in entries if e.get('author_unparsed')]
    for e in unparsed:
        issues.append((
            e['grade'],
            'We could not tell whether the first column here is an author or part of the '
            'title, because it has no comma.',
            f'#{e["id"]} {e["author_unparsed"]} | {e["title_as_printed"]}',
        ))

    r = 5
    for i, (grade, what, rows) in enumerate(issues, start=1):
        put(ws, r, 1, i)
        put(ws, r, 2, grade)
        put(ws, r, 3, what, wrap=True)
        put(ws, r, 4, rows, wrap=True)
        put(ws, r, 5, '', ask=True, wrap=True)
        put(ws, r, 6, '', ask=True, wrap=True)
        ws.row_dimensions[r].height = 30
        r += 1
    dropdown(ws, ['Yes - intended', 'No - we will fix it', 'Not sure'], 'E', 5, max(5, r - 1))
    return len(issues)


# --- main --------------------------------------------------------------------


# The lists spell some counts out in Finnish; give the reader the digit too.
FI_NUMBERS = {
    'yksi': '1', 'kaksi': '2', 'kolme': '3', 'nelja': '4', 'viisi': '5',
    'kuusi': '6', 'seitseman': '7', 'kahdeksan': '8', 'yhdeksan': '9',
}


def books_required(intro):
    """Pull the book count out of the grade's intro paragraph, if it states one."""
    import re
    m = re.search(r'(\d+\s*[–-]\s*\d+|[a-zaouäö]+)\s+kirjaa', intro, re.I)
    if not m:
        return None
    raw = m.group(1).strip()
    word = raw.lower().replace('ä', 'a').replace('ö', 'o')
    if word in FI_NUMBERS:
        return f'{FI_NUMBERS[word]}  ({raw})'
    return raw.replace(' ', '') if re.search(r'\d', raw) else None


def main():
    if not ENTRIES.exists():
        sys.exit('FAIL: entries.json is missing -- run parse.py first')
    data = json.loads(ENTRIES.read_text(encoding='utf-8'))
    src = json.loads(SOURCES.read_text(encoding='utf-8'))
    entries, per_grade = data['entries'], data['grades']

    for g, d in per_grade.items():
        d['category_counts'] = {
            c: sum(1 for e in entries if e['grade'] == g and e['category'] == c)
            for c in d['categories']
        }
        d['books_required'] = books_required(d['intro'])

    problems = validate_mapping(per_grade)
    if problems:
        print('FAIL: the draft continent map does not cover the parsed categories:')
        for p in problems:
            print('  -', p)
        sys.exit(1)

    totals = {
        'needs_title': sum(
            1 for e in entries
            if len(e['concrete_titles']) != 1 or e['series_note']
        ),
        'entries': len(entries),
        'categories': sum(len(d['categories']) for d in per_grade.values()),
        'ambiguous': sum(1 for e in entries if e['is_ambiguous']),
    }

    wb = Workbook()
    wb.remove(wb.active)
    readme = sheet_readme(wb, src, per_grade, totals)
    n_amb = sheet_ambiguous(wb, entries)
    sheet_map(wb, per_grade)
    sheet_progression(wb, per_grade)
    sheet_g12(wb, per_grade)
    sheet_all(wb, entries)
    n_quality = sheet_quality(wb, entries)

    # The README quotes the quality count, which is only known once that sheet
    # has been built.
    for row in readme.iter_rows(min_col=2, max_col=2):
        for c in row:
            if isinstance(c.value, str) and c.value.startswith('06_Data_quality'):
                c.value = c.value.replace('{n}', str(n_quality))

    OUT.parent.mkdir(exist_ok=True)
    wb.save(OUT)
    print(f'grades         {len(GRADES)}')
    print(f'groups         {totals["categories"]}')
    print(f'entries        {totals["entries"]}')
    print(f'Q1 ambiguous   {n_amb}')
    print(f'Q6 oddities    {n_quality}')
    print(f'\nwrote {OUT}')


if __name__ == '__main__':
    main()
