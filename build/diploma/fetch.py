"""Step 1 of the pipeline: discover and download the Lukudiplomi book-list PDFs.

The lists live on the customer's WordPress site as PDF attachments of one page.
We never hardcode the PDF URLs: they are re-discovered from the WP REST API on
every run, so a file the library replaces next summer is picked up automatically.

    python fetch.py            # download into cache/, write sources.json
    python fetch.py --offline  # re-hash whatever is already in cache/

sources.json records each file's sha256 and the page's `modified` timestamp, so
verify.py can tell "the customer republished the list" apart from "our parser
changed".
"""

import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
CACHE = HERE / 'cache'
SOURCES = HERE / 'sources.json'

# The Lukudiplomi page on ylivieska.fi. Resolved once by title; the id is kept
# as a fallback so a rename of the page does not break the pipeline silently.
PAGE_ID = 4129
PAGE_SEARCH = 'https://www.ylivieska.fi/wp-json/wp/v2/pages?search=lukudiplomi&per_page=5&_fields=id,link,title'
PAGE_API = 'https://www.ylivieska.fi/wp-json/wp/v2/pages/{id}?_fields=id,link,modified,content'

# Only the six book lists. The page also links instructions, completion forms
# and certificate templates, which carry no book data.
GRADE_PDF = re.compile(r'/((?:\d\.-)?\d\.)-luokka\.pdf$')

# PDF basename -> the grade band we use everywhere downstream.
GRADE_BANDS = {
    '1.-2.-luokka': '1-2',
    '3.-4.-luokka': '3-4',
    '5.-6.-luokka': '5-6',
    '7.-luokka': '7',
    '8.-luokka': '8',
    '9.-luokka': '9',
}

UA = {'User-Agent': 'ReadingDiploma-import/1.0 (+school project; contact via repo)'}


def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def sha256(path):
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def discover():
    """Return (page_meta, {basename: url}) for the six grade PDFs."""
    page_id = PAGE_ID
    try:
        hits = get_json(PAGE_SEARCH)
        exact = [h for h in hits if h['title']['rendered'].strip().lower() == 'lukudiplomi']
        if exact:
            page_id = exact[0]['id']
    except Exception as e:                                   # noqa: BLE001
        print(f'  ! page search failed ({e}), falling back to id {PAGE_ID}')

    page = get_json(PAGE_API.format(id=page_id))
    html = page['content']['rendered']
    found = {}
    for url in re.findall(r'href="([^"]+\.pdf)"', html):
        m = GRADE_PDF.search(url)
        if not m:
            continue
        name = url.rsplit('/', 1)[-1][:-4]
        if name in GRADE_BANDS:
            found[name] = url
    meta = {'page_id': page['id'], 'page_link': page['link'], 'page_modified': page['modified']}
    return meta, found


def main():
    offline = '--offline' in sys.argv
    CACHE.mkdir(exist_ok=True)

    if offline:
        meta, found = {'page_id': None, 'page_link': None, 'page_modified': None}, {
            name: None for name in GRADE_BANDS
        }
        print('offline: using cache/ as-is')
    else:
        print('discovering PDFs via the WordPress REST API ...')
        meta, found = discover()
        print(f"  page {meta['page_id']} last modified {meta['page_modified']}")

    missing = set(GRADE_BANDS) - set(found)
    if missing:
        sys.exit(f'FAIL: the page no longer links these lists: {sorted(missing)}')

    files = []
    for name in sorted(GRADE_BANDS, key=lambda n: list(GRADE_BANDS).index(n)):
        dest = CACHE / f'{name}.pdf'
        url = found[name]
        if url:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
        if not dest.exists():
            sys.exit(f'FAIL: {dest} is missing and no URL to fetch it from')
        digest = sha256(dest)
        files.append({
            'grade': GRADE_BANDS[name],
            'basename': name,
            'url': url,
            'bytes': dest.stat().st_size,
            'sha256': digest,
        })
        print(f'  {name:14s} {dest.stat().st_size:>7,} B  {digest[:12]}')

    SOURCES.write_text(
        json.dumps({'source': meta, 'files': files}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    print(f'\nwrote {SOURCES.relative_to(HERE.parent.parent)}  ({len(files)} lists)')


if __name__ == '__main__':
    main()
