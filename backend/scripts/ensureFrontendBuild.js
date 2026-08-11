import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '..')
const frontendRoot = path.resolve(backendRoot, '../frontend')

console.log('Building frontend for production...')
const result = spawnSync('npm', ['run', 'build'], {
    cwd: frontendRoot,
    stdio: 'inherit',
    env: process.env,
    shell: true
})

if (result.status !== 0) {
    process.exit(result.status ?? 1)
}
