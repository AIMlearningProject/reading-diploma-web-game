import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '..')

const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
        cwd: backendRoot,
        stdio: 'inherit',
        env: process.env,
        shell: true,
        ...options
    })

    if (result.error) {
        console.error(result.error)
        process.exit(1)
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1)
    }
}

run('node', [path.join(backendRoot, 'node_modules', 'knex', 'bin', 'cli.js'), 'migrate:latest'])
run('npm', ['run', 'start'])
