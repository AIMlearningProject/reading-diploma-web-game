# Lukudiplomi import pipeline

Turns the Ylivieska library's published **Kirja kantaa -lukudiplomi** book lists into game
data. Offline only: nothing here runs in the backend, and the backend gains no new
dependency. The pipeline downloads PDFs, parses them, and produces JSON the seed loads.

Scaffolded from `~/.claude/templates/asset-pipeline/`. Read that template's rules before
changing `mapping.py` / `verify.py` — the point of those two files is that every constraint
the customer states becomes an executable check rather than something to remember.

## Why the lists are not scraped at runtime

The PDFs are dated 2023/07 and have not changed since. Parsing 500+ rows of a hand-made
PDF needs a human to look at the result before it reaches pupils, and the game should not
go down because the city website does. So: fetch offline, review, commit the JSON.

## Order of work

```
python fetch.py         # discover + download the six PDFs      -> cache/, sources.json
python parse.py         # PDF -> structured rows                -> entries.json
python questions.py     # the open questions for the customer   -> out/*.xlsx
   ... send the workbook, wait for the library's answers, save them as answers.xlsx ...
python verify.py        # every stated constraint, as a check   (exit != 0 fails the build)
python audition.py      # the final list for a human to sign off -> out/review.html
```

`verify.py`, `mapping.py`, `audition.py` and `selftest.py` are still the template's
versions. They get filled in once the customer's answers come back — see step 1 of the
plan. `fetch.py`, `parse.py` and `questions.py` are the ones that are live.

## fetch.py

The PDF URLs are **not** hardcoded. The Lukudiplomi page is a WordPress page, so the
script reads `wp-json/wp/v2/pages/<id>` and pulls the six `*-luokka.pdf` links out of the
rendered content. The page is located by title first and falls back to id 4129. If the
library replaces a list next summer, re-running `fetch.py` picks it up.

`sources.json` records each PDF's sha256 and the page's `modified` timestamp, so a later
run can tell "the customer republished the list" apart from "our parser changed".

`--offline` re-hashes whatever is in `cache/` without touching the network.

## parse.py

The layout facts the parser relies on, all measured rather than assumed:

| | |
|---|---|
| Author column | x0 ≈ 57 |
| Title column | x0 ≈ 187.1 (a fixed tab stop) |
| Two-column row | gap between the columns is 34–75 pt |
| Flowing prose (intro, notes under a heading) | gap ≈ 3 pt — this is how prose is told apart from a row |
| Category heading | **every** word bold; `any` would swallow the intro, which has a few bold words in it |
| Wrapped title line | ~14 pt below its row; a separate author-less row sits ~21 pt below |

Two passes: the first collects all headings, so the second can drop the copy of the next
heading that the PDF echoes into the right column at a page break (bottom of
`1.-2.-luokka` page 2).

Each row's title cell is split on ` tai ` into **concrete titles** and a **series note**.
`Merkitty tai jokin muu Yön talo -sarjan kirja` yields one concrete title and one note, and
is flagged `is_ambiguous` — the game cannot bind "any other book in the series" to a single
record, so the pupil has to say which book they actually read.

Ids are assigned in document order and are **frozen**: the customer answers by id, so a
re-parse must never renumber. `verify.py` enforces this against the committed
`entries.json`.

## Current numbers

| Grade | Groups | Rows | Ambiguous | No author |
|---|---|---|---|---|
| 1–2 | 6 | 75 | 46 | 16 |
| 3–4 | 6 | 69 | 36 | 7 |
| 5–6 | 9 | 96 | 44 | 5 |
| 7 | 6 | 75 | 12 | 2 |
| 8 | 5 | 84 | 14 | 11 |
| 9 | 5 | 113 | 13 | 4 |
| **Total** | **37** | **512** | **165** | **45** |

512 rows over 8 continents per grade. 37 groups over 6 × 8 = 48 slots. Those two ratios are
what make the open questions obvious, and they are why `mapping.py` exists.
