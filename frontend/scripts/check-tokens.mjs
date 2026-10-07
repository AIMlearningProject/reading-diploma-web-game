// Fails if a stylesheet uses a var() that tokens.css does not define, so a
// renamed or dropped token cannot silently fall back to nothing. Run it after
// regenerating tokens.css and after migrating a page off raw hex values.
//
//   npm run lint:tokens

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not URL.pathname: the project path contains a space, which
// stays percent-encoded in pathname and then fails to open.
const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const TOKENS = path.join(SRC, 'tokens.css')

// Custom properties set from JSX at runtime, not design tokens.
const RUNTIME = new Set(['--size', '--tile-size', '--tile-index', '--requiredSpace', '--ps-scale'])

function walk(directory) {
    return readdirSync(directory).flatMap(name => {
        const entry = path.join(directory, name)
        if (statSync(entry).isDirectory()) return walk(entry)
        return entry.endsWith('.css') ? [entry] : []
    })
}

const defined = new Set(
    readFileSync(TOKENS, 'utf8').matchAll(/^\s*(--[\w.-]+)\s*:/gm).map(m => m[1])
)

let failures = 0
for (const file of walk(SRC)) {
    if (file === TOKENS) continue
    const used = new Set(readFileSync(file, 'utf8').matchAll(/var\(\s*(--[\w.-]+)/g).map(m => m[1]))
    const missing = [...used]
        .filter(name => !defined.has(name) && !RUNTIME.has(name))
        .toSorted((a, b) => a.localeCompare(b))
    if (missing.length > 0) {
        const relative = path.relative(SRC, file).split(path.sep).join('/')
        console.error(`${relative}: undefined ${missing.join(', ')}`)
        failures += missing.length
    }
}

if (failures > 0) {
    console.error(`\n${failures} undefined custom ${failures === 1 ? 'property' : 'properties'}.`)
    process.exit(1)
}
console.log(`tokens.css defines ${defined.size} custom properties; every var() in src/ resolves.`)
