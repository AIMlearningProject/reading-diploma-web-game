"""The single place where the book lists meet the game.

Everything downstream -- the JSON the backend seeds, the labels the world map
shows, which books a continent offers -- is derived from this file. Nothing else
in the codebase decides any of it.

==============================================================================
 PENDING THE LIBRARY'S ANSWERS
==============================================================================
The questionnaire in out/Lukudiplomi_open_questions.xlsx asks the library four
questions. Until it comes back, each one is answered here with a placeholder
marked PENDING-Qn. When the answers arrive, edit ONLY this file:

  PENDING-Q1  AMBIGUOUS_HANDLING   how "any other book in the series" behaves
  PENDING-Q2  DRAFT                which group sits on which continent
  PENDING-Q3  BOOKS_REQUIRED       how many books the game should ask for
  PENDING-Q4  GRADE_1_2_GROUPS     the three reading-level groups of grade 1-2

validate() fails the build if a placeholder stops matching the parsed lists --
so a list the library republishes cannot silently drift away from this file.
==============================================================================
"""

# --- the game's eight continents ---------------------------------------------
# Keys and order match frontend/src/game/scenes/continentRegistry.js and
# ReadingState.mapOrder, where level N is mapOrder[N - 1]. Do not reorder:
# the level numbers in the progress table depend on it.

CONTINENTS = [
    ('ArcticMap', 'Arctic', 'Poetry and rhymes'),
    ('EuropeMap', 'Europe', 'Classics and picture books'),
    ('AsiaMap', 'Asia', 'Fantasy and science fiction'),
    ('NorthAmericaMap', 'North America', 'Suspense and adventure'),
    ('SouthAmericaMap', 'South America', 'Animals and hobbies'),
    ('AfricaMap', 'Africa', 'Life here and now'),
    ('OceaniaMap', 'Oceania', 'History and biography'),
    ('AntarcticaMap', 'Antarctica', 'Non-fiction'),
]

GRADES = ['1-2', '3-4', '5-6', '7', '8', '9']


# --- PENDING-Q2: which group sits on which continent -------------------------
# 37 groups over 6 grades x 8 continents = 48 slots. A continent with no group
# for a grade offers that grade's whole list instead ("Vapaa valinta"), which is
# also what the diploma itself does for grades 7-9 ("three books freely").
#
# Placeholder: our draft, thematically continuous across grades where the source
# allows it. Replace wholesale from sheet 02 of the questionnaire.

DRAFT = {
    'ArcticMap': {
        '1-2': ['Runoja ja loruja'],
        '3-4': ['Iloinen lipas – runoja ja loruja'],
        '5-6': ['Pegasuksen siivillä - runoja'],
        '7': ['6. Runoja ja novelleja'],
        '8': ['5. Novellit, runot, lyriikka'],
        '9': ['5. Runot ja novellit'],
    },
    'EuropeMap': {
        '1-2': ['Kuvakirjoja'],
        '3-4': [],
        '5-6': ['Klassikkotarinoita'],
        '7': ['3. Suosikkeja vuosikymmenten takaa'],
        '8': [],
        '9': ['3. Kotimaisia ja ulkomaisia klassikoita'],
    },
    'AsiaMap': {
        '1-2': ['Villejä viikareita ja outoja otuksia'],
        '3-4': ['Jännittäviä seikkailuja ja lumottuja maailmoja'],
        '5-6': ['Fantasiaa ja scifiä'],
        '7': ['1. Fantasiaa ja jännitystä'],
        '8': ['1. Fantasiaa ja tieteiskirjoja'],
        '9': ['1. Fantasiaa, tieteiskirjoja ja jännitystä'],
    },
    'NorthAmericaMap': {
        '1-2': ['Helppolukuisia kirjoja'],
        '3-4': [],
        '5-6': ['Jännitystä, seikkailuja ja kummitustarinoita'],
        '7': [],
        '8': ['2. Jännitystä ja kauhua'],
        '9': [],
    },
    'SouthAmericaMap': {
        '1-2': [],
        '3-4': ['Eläinystävämme', 'Harrastuksen iloa'],
        '5-6': ['Eläimiä tarinoissa', 'Harrastuksia'],
        '7': ['5. Harrastuksia'],
        '8': [],
        '9': [],
    },
    'AfricaMap': {
        '1-2': [],
        '3-4': ['Hauskoja tarinoita'],
        '5-6': ['Elämää tässä ja nyt'],
        '7': ['2. Aikamme kertomuksia'],
        '8': ['3. Äsken ja nyt'],
        '9': ['2. Aikamme kertomuksia'],
    },
    'OceaniaMap': {
        '1-2': ['Ta-vu-tet-tu-ja kir-jo-ja'],
        '3-4': [],
        '5-6': ['Eilispäivää'],
        '7': ['4. Historian salaisuuksia. Totta ja tarinaa.'],
        '8': ['4. Historiaa ja elämäkertoja'],
        '9': ['4. Elämää kansien välissä'],
    },
    'AntarcticaMap': {
        '1-2': ['Tietoa ja taitoa'],
        '3-4': ['Tietoa ja taitoa'],
        '5-6': ['Tietoa ja taitoa'],
        '7': [],
        '8': [],
        '9': [],
    },
}


# --- PENDING-Q1: rows that do not name one single book -----------------------
# 165 of the 512 rows either offer a choice ("X tai jokin muu Y -sarjan kirja")
# or name a series only ("Keplo Leutokalma -sarja").
#
# Placeholder: option A from the questionnaire -- keep the row as one catalogue
# entry and ask the pupil to type the book they actually read. It needs no data
# the library has not published, and it degrades gracefully if they later pick
# option B (a fixed list of titles), which only adds rows.
#
#   'ask'  -> one entry; the pupil types the title  (option A)
#   'split'-> one entry per concrete title          (option B, needs their lists)

AMBIGUOUS_HANDLING = 'ask'


# --- PENDING-Q3: how many books the game asks for ----------------------------
# The diploma asks for 5-6 books in grade 1-2 and eight in grades 7-9, while the
# game has eight continents. Placeholder: the game asks for its eight, i.e. a
# grade 1-2 pupil reads more than the paper diploma requires.
#
# If the library says the game should match the diploma, set this per grade to
# the number from sheet 03 and the world map will stop requiring the rest.

BOOKS_REQUIRED = {g: 8 for g in GRADES}


# --- PENDING-Q4: the grade 1-2 reading-level groups --------------------------
# Kuvakirjoja / Ta-vu-tet-tu-ja kir-jo-ja / Helppolukuisia kirjoja describe how
# hard a book is, not what it is about. Placeholder: show them exactly as
# printed, which is honest even if it makes those three continents off-theme.
#
#   'as_printed' -> use the group name from the PDF   (option A)
#   'merge'      -> one combined group                (option B)

GRADE_1_2_GROUPS = 'as_printed'


# --- Finnish labels for a continent with no group ----------------------------
# Shown on the world map and above the book list. UI text is Finnish; see
# CLAUDE.md -- do not translate.

FREE_CHOICE_LABEL = 'Vapaa valinta'


# --- checks ------------------------------------------------------------------


def continent_for(grade, category):
    """The continent key a parsed category belongs on, or None."""
    for key in DRAFT:
        if category in DRAFT[key][grade]:
            return key
    return None


def validate(per_grade):
    """Every constraint that has to hold across all 48 slots, as code.

    `per_grade` is entries.json's "grades" object. Returns a list of problems;
    an empty list means the mapping still matches the published lists.
    """
    problems = []
    known = {key for key, _, _ in CONTINENTS}

    if set(DRAFT) != known:
        problems.append(f'DRAFT keys {sorted(DRAFT)} != continents {sorted(known)}')
        return problems

    for grade in GRADES:
        if grade not in per_grade:
            problems.append(f'grade {grade}: not present in the parsed lists')
            continue
        real = per_grade[grade]['categories']
        placed = [c for key in DRAFT for c in DRAFT[key][grade]]

        for orphan in [c for c in real if c not in placed]:
            problems.append(f'grade {grade}: group is on no continent: {orphan!r}')
        for ghost in [c for c in placed if c not in real]:
            problems.append(f'grade {grade}: group is not in the PDF any more: {ghost!r}')
        for dup in sorted({c for c in placed if placed.count(c) > 1}):
            problems.append(f'grade {grade}: group placed on two continents: {dup!r}')

        for key in DRAFT:
            n = len(DRAFT[key][grade])
            if n > 2:
                problems.append(
                    f'grade {grade}: {key} carries {n} groups; at most 2 (and 2 only '
                    f'where the grade has more groups than there are continents)')

        required = BOOKS_REQUIRED[grade]
        if not 1 <= required <= len(CONTINENTS):
            problems.append(
                f'grade {grade}: BOOKS_REQUIRED is {required}, outside 1..{len(CONTINENTS)}')

    if AMBIGUOUS_HANDLING not in ('ask', 'split'):
        problems.append(f'AMBIGUOUS_HANDLING is {AMBIGUOUS_HANDLING!r}')
    if GRADE_1_2_GROUPS not in ('as_printed', 'merge'):
        problems.append(f'GRADE_1_2_GROUPS is {GRADE_1_2_GROUPS!r}')

    return problems
