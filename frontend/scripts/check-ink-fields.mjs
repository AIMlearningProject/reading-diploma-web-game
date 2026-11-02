// Every form field on a screen drawn in ink is drawn in ink too.
//
//   npm run lint:ink
//
// A native input, select or textarea draws itself in straight lines, which on
// an ink screen is a field the restyle forgot. In the files below each one
// must be one of:
//
//   - a checkbox carrying .ink-check, or a range carrying .ink-range;
//   - inside an element whose className names .ink-field or .ink-box;
//   - the first argument of inkField(...), BookSearchBar's helper that wraps
//     a field in .ink-field for the pupil and leaves the teacher's alone.
//
// The rules themselves are in src/components/ink/ink.css. The script checks
// itself first against a field that must fail and one that must pass, so a
// change that stops it finding anything fails too.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

// fileURLToPath, not URL.pathname: the project path contains a space.
const SRC = fileURLToPath(new URL('../src/', import.meta.url))

// The screens drawn in ink. Add a screen here when it moves to ink.css.
const FILES = [
    'pages/StudentDashboard.jsx',
    'pages/StudentLoginPage.jsx',
    'pages/StudentSignUpPage.jsx',
    'components/BookSearchBar.jsx',
    'components/popups/BookListPanel.jsx',
    'components/popups/AddBookPopup.jsx',
    'components/popups/ReactQuiz.jsx',
    'components/popups/UpdateProgressPopup.jsx',
    'components/minigames/MiniGameCanvas.jsx',
    'components/minigames/SceneGameModal.jsx',
    'components/puzzle/PuzzleScene.jsx',
    'components/puzzle/ItemFoundCard.jsx'
]

const FIELDS = new Set(['input', 'select', 'textarea'])

function attribute(element, name) {
    return element.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === name)
}

// The source text of an attribute's value, so a className built from a
// template or a ternary is read as written.
function attributeSource(source, element, name) {
    const value = attribute(element, name)?.value
    return value ? source.slice(value.start, value.end) : ''
}

function problemsIn(source, label) {
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
    const found = []

    // Walk every node, keeping the chain of enclosing nodes.
    function walk(node, ancestors) {
        if (!node || typeof node.type !== 'string') return

        if (node.type === 'JSXElement' && node.openingElement.name.type === 'JSXIdentifier'
            && FIELDS.has(node.openingElement.name.name)) {
            const tag = node.openingElement.name.name
            const type = attributeSource(source, node, 'type').replaceAll(/['"]/g, '')
            const own = attributeSource(source, node, 'className')
            const line = node.loc.start.line

            switch (type) {
                case 'hidden': {
                    break // nothing drawn
                }
                case 'checkbox': {
                    if (!own.includes('ink-check')) found.push(`${label}:${line}  checkbox without .ink-check`)
                    break
                }
                case 'range': {
                    if (!own.includes('ink-range')) found.push(`${label}:${line}  range without .ink-range`)
                    break
                }
                default: {
                    const wrapped = ancestors.some(a =>
                        (a.type === 'JSXElement' && /ink-(field|box)\b/.test(attributeSource(source, a, 'className')))
                        || (a.type === 'CallExpression' && a.callee.type === 'Identifier' && a.callee.name === 'inkField'))
                    if (!wrapped) found.push(`${label}:${line}  <${tag}> not inside .ink-field or .ink-box`)
                }
            }
        }

        for (const [key, value] of Object.entries(node)) {
            if (['loc', 'start', 'end'].includes(key)) continue
            const children = Array.isArray(value) ? value : [value]
            for (const child of children) {
                if (child && typeof child.type === 'string') walk(child, [...ancestors, node])
            }
        }
    }

    walk(ast.program, [])
    return found
}

// ── Self-check ──────────────────────────────────────────────

const MUST_FAIL = `export default () => <div><input value="a" /><input type="checkbox" /></div>`
const MUST_PASS = `
const inkField = (f) => f
export default () => (
    <div>
        <span className="ink-field"><input /></span>
        <div className={\`ink-box \${x}\`}><textarea /></div>
        {inkField(<select />)}
        <input type="checkbox" className="ink-check" />
        <input type="range" className="x ink-range" />
        <input type="hidden" />
    </div>
)`

const failed = problemsIn(MUST_FAIL, 'self-check')
const passed = problemsIn(MUST_PASS, 'self-check')
if (failed.length !== 2 || passed.length > 0) {
    console.error('check-ink-fields is broken: its own examples gave the wrong answer.')
    console.error({ shouldFindTwo: failed, shouldFindNone: passed })
    process.exit(1)
}

// ── The ink screens ─────────────────────────────────────────

const problems = FILES.flatMap(relative => problemsIn(readFileSync(path.join(SRC, relative), 'utf8'), relative))

if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(`\n${problems.length} undrawn ${problems.length === 1 ? 'field' : 'fields'}. The ink field rules are at the top of src/components/ink/ink.css.`)
    process.exit(1)
}
console.log(`Every field is drawn in ink across ${FILES.length} ink screens.`)
