// Enforces the shape law documented at the top of pages/TeacherDashboard.css,
// so it holds across every rule rather than across whatever was remembered on
// the day. Before this existed the teacher page carried 48 bordered boxes in
// 12 different radii and 6 control heights.
//
//   npm run lint:shapes
//
// Three rules, checked over the teacher-side stylesheets:
//
//   1. RADIUS  Only 0, --radius-md, --radius-pill and --radius-round appear.
//   2. BOX     A rule may not have both a full border and a non-zero radius
//              unless its selector is something you click, type into, or look
//              at as an image or a marker. Containers group with a rule
//              (border-top / border-left) and a ground, never with a box.
//   3. BASELINE Every control declares min-height: 34px.
//
// Rule 2 is the one that matters: a border is a signal that something is
// interactive, not a way to draw a group. It is what stops panels nesting.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not URL.pathname: the project path contains a space, which
// stays percent-encoded in pathname and then fails to open.
const SRC = fileURLToPath(new URL('../src/', import.meta.url))

const FILES = [
    'paper.css',
    'pages/TeacherDashboard.css',
    'components/TeacherProfileCard.css',
    'components/InviteSection.css',
    'components/BookSearchBar.css',
    'components/InfoButton.css'
]

const RADII = new Set([
    '0',
    'var(--radius-md)',
    'var(--radius-pill)',
    'var(--radius-round)',
    // the one tab shape: rounded at the top, square where it meets its rule
    'var(--radius-md) var(--radius-md) 0 0'
])

// A selector may carry a box when it is one of these. Everything else groups
// with a rule.
const MAY_BE_A_BOX = [
    /button/i, /btn/i, /select/i, /input/i, /\.book-tab/, /\.continent-chip/,
    /\.avatar-option/, /\.pager/, /\.copy-/, /\.tr-popup-close/,
    /\.status-legend-toggle/,                             // click
    /\.voyage-rail/, /\.voyage-leg/, /\.student-count/, /\.status-legend-who/,
    /\.diploma-books-flag/, /\.node-row-index/, /\.continent-chip-level/,
    /\.status-legend-mark/, /\.gmail-g/, /\.avatar-check/, /\.avatar-badge/,
    /\.avatar-ring/,                                      // marker
    /\.qr-image/, /cover/, /thumb/, /\.zoom-img/          // image
]

// Every control sits on one baseline. Listed by hand: a selector is a control
// because of what it does, which a regex cannot tell.
const CONTROLS = [
    '.teacher-dashboard .logout-button', '.add-button', '.upload-button',
    '.delete-button', '.open-transfer-requests-button', '.accept-button',
    '.cancel-button', '.pwd-save-btn', '.continent-chip', '.expand-btn',
    '.status-legend-toggle', '.level-status-select', '.grade-select',
    '.diploma-books-pager button', '.diploma-books-field select',
    '.book-tab', '.copy-button', '.regen-btn', '.search-input',
    '.booktype-select', '.pager-button', '.add-book-btn', '.edit-profile-button'
]

const BASELINE = 'min-height: 34px'

function rules(css) {
    // Good enough for this codebase: no nested at-rules beyond one level of
    // @media, and no braces inside values.
    const stripped = css.replaceAll(/\/\*[\s\S]*?\*\//g, '')
    return stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)
        .map(m => ({ selector: m[1].trim().replaceAll(/\s+/g, ' '), body: m[2] }))
        .filter(r => !r.selector.startsWith('@'))
        .toArray()
}

const problems = []

for (const relative of FILES) {
    const css = readFileSync(path.join(SRC, relative), 'utf8')
    const parsed = rules(css)

    for (const { selector, body } of parsed) {
        const radius = body.match(/border-radius:\s*([^;]+);/)
        const value = radius?.[1].trim()

        // 1. radius tiers
        if (value && !RADII.has(value)) {
            problems.push(`${relative}  ${selector}\n    radius ${value} is not one of 0 / md / pill / round`)
        }

        // 2. a box is only for something interactive, a marker, or an image
        const border = body.match(/(?:^|\s)border:\s*([^;]+);/)
        const hasBorder = border && !/^none\b/.test(border[1].trim())
        const rounded = value && value !== '0'
        if (hasBorder && rounded && MAY_BE_A_BOX.every(re => !re.test(selector))) {
            problems.push(`${relative}  ${selector}\n    a bordered, rounded box, but nothing here is clickable or a marker — group it with a border-top or border-left and a ground instead`)
        }
    }

    // 3. one control baseline
    for (const control of CONTROLS) {
        const rule = parsed.find(r => r.selector.split(',').some(part => part.trim() === control))
        if (rule && !rule.body.includes(BASELINE)) {
            problems.push(`${relative}  ${control}\n    a control without ${BASELINE}`)
        }
    }
}

if (problems.length > 0) {
    console.error(problems.join('\n\n'))
    console.error(`\n${problems.length} shape ${problems.length === 1 ? 'problem' : 'problems'}. The law is at the top of pages/TeacherDashboard.css.`)
    process.exit(1)
}
console.log(`Shape law holds across ${FILES.length} stylesheets: 4 radius values, no box that is not interactive, one 34px control baseline.`)
