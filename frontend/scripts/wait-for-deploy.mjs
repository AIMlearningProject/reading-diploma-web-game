// Waits until the public test site serves a new frontend build. Read-only.
//
//   npm run -s deploy:wait -- --current          print the bundle the site serves now
//   npm run -s deploy:wait -- <bundle>           wait until it serves a different one
//   npm run -s deploy:wait -- <bundle> --url <site>
//
// Run --current before `git push`, then pass what it printed. Render deploys
// `main` on every push; the build is live once / names a new index-*.js.
//
// The public site holds testers' data, so this script only ever reads: every
// request goes through get(), which sends GET and nothing else. It never logs
// in and never calls an /api or /auth route. A push that changes only the
// backend leaves the bundle as it was; this script cannot see that deploy.

const DEFAULT_URL = 'https://lukudiplomi-peli.onrender.com'
const INTERVAL_MS = 30_000
const GIVE_UP_MS = 15 * 60_000
// A free Render service sleeps and takes about a minute to wake.
const REQUEST_TIMEOUT_MS = 90_000

const cliArguments = process.argv.slice(2)
const urlAt = cliArguments.indexOf('--url')
const site = (urlAt === -1 ? DEFAULT_URL : cliArguments[urlAt + 1]).replace(/\/$/, '')
const wantsCurrent = cliArguments.includes('--current')
const previous = cliArguments.find(
    (value, index) => !value.startsWith('--') && cliArguments[index - 1] !== '--url'
)

/** The only network call in this file. */
async function get(path) {
    const response = await fetch(site + path, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    return { status: response.status, text: await response.text() }
}

async function currentBundle() {
    const { status, text } = await get('/')
    if (status !== 200) return
    return text.match(/assets\/index-[\w-]+\.js/)?.[0]
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

if (wantsCurrent) {
    const bundle = await currentBundle()
    if (!bundle) {
        console.error(`wait-for-deploy: ${site} did not answer with a page naming its bundle.`)
        process.exit(1)
    }
    console.log(bundle)
    process.exit(0)
}

if (!previous) {
    console.error('wait-for-deploy: pass the bundle printed by --current before the push.')
    process.exit(2)
}

const started = Date.now()
for (let attempt = 1; Date.now() - started < GIVE_UP_MS; attempt++) {
    let bundle
    try {
        bundle = await currentBundle()
    } catch (error) {
        console.log(`attempt ${attempt}: no answer (${error.name})`)
    }
    if (bundle && bundle !== previous) {
        const { status } = await get('/' + bundle)
        const seconds = Math.round((Date.now() - started) / 1000)
        console.log(`live after ${seconds}s: ${bundle} (bundle answers ${status})`)
        process.exit(status === 200 ? 0 : 1)
    }
    await sleep(INTERVAL_MS)
}
console.error(`wait-for-deploy: still ${previous} after 15 minutes. Check the deploy log on Render.`)
process.exit(1)
