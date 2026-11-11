// Every relative import names its file with the exact case it has on disk.
//
//   npm run lint:case
//
// Windows and macOS find '../Assets/Book.png' when the file is
// '../assets/book.png', so the build passes here. Render builds on Linux, which
// does not, and the deploy fails there. This walks every import in src/ and
// compares each path segment against the real directory listing.
//
// The script checks itself first against an import that must fail and one that
// must pass, so a change that stops it finding anything fails too.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not URL.pathname: the project path contains a space.
const SRC = fileURLToPath(new URL('../src/', import.meta.url))

// The endings Vite tries for an import written without one.
const CANDIDATES = ['', '.js', '.jsx', '/index.js', '/index.jsx']

// Static imports, re-exports, side-effect imports and dynamic import().
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g

const listings = new Map()
const namesIn = (directory) => {
    if (!listings.has(directory)) {
        let names
        try {
            names = new Set(readdirSync(directory))
        } catch {
            names = new Set()
        }
        listings.set(directory, names)
    }
    return listings.get(directory)
}

/** True when `target` exists with exactly this case in every segment below SRC. */
function existsExactly(target) {
    const relative = path.relative(SRC, target)
    if (relative.startsWith('..')) return false
    let directory = SRC
    for (const segment of relative.split(path.sep)) {
        if (!namesIn(directory).has(segment)) return false
        directory = path.join(directory, segment)
    }
    return true
}

function resolves(fromFile, specifier) {
    const clean = specifier.split('?', 1)[0]
    const base = path.resolve(path.dirname(fromFile), clean)
    return CANDIDATES.some((ending) => {
        const candidate = path.normalize(base + ending)
        if (!existsExactly(candidate)) return false
        // A bare directory is not an import target; only its index file is.
        return ending !== '' || statSync(candidate).isFile()
    })
}

function* sourceFiles(directory) {
    const entries = readdirSync(directory, { withFileTypes: true })
    for (const entry of entries) {
        const full = path.join(directory, entry.name)
        if (entry.isDirectory()) yield* sourceFiles(full)
        else if (/\.(js|jsx)$/.test(entry.name)) yield full
    }
}

// Self-check: src/main.jsx must pass, and the same path with one letter's case
// flipped must fail.
const probe = path.join(SRC, 'main.jsx')
const wrongCase = path.join(SRC, 'Main.jsx')
if (!resolves(probe, './main.jsx') || resolves(probe, './' + path.basename(wrongCase))) {
    console.error('check-import-case: the self-check failed, so the check itself is broken.')
    process.exit(1)
}

const problems = []
let checked = 0
for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(IMPORT)) {
        checked += 1
        if (!resolves(file, match[1])) {
            problems.push(`${path.relative(SRC, file)}: '${match[1]}'`)
        }
    }
}

if (problems.length > 0) {
    console.error(`check-import-case: ${problems.length} import(s) do not match a file with the same case:`)
    for (const problem of problems) console.error('  ' + problem)
    process.exit(1)
}
console.log(`check-import-case: ${checked} relative imports, all match their files exactly.`)
