import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        env: { 'NODE_ENV': 'test' },
        globals: true,
        globalSetup: ['./tests/testConfig/globalSetup.js'],
        environment: 'node',
        //setupFiles: ['./tests/testConfig/vitest.setup.js'],
        // Keep the leading './'. Without it vitest finds no test files at all on
        // Windows when the project path contains a space.
        include: ['./tests/integration/**/*.test.js'],
        passWithNoTests: true,
        coverage: {
            enabled: true,
            provider: 'istanbul', // v8 is not supported by Node.js 18, changed this to istanbul
            clean: true,
            include: ['controllers/**/*.js', 'models/**/*.js', 'services/**/*.js', 'utils/middleware.js'],
        }
    }
})