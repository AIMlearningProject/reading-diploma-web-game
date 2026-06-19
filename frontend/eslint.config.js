import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import eslintPluginUnicorn from 'eslint-plugin-unicorn'

export default defineConfig([
    js.configs.recommended,
    eslintPluginUnicorn.configs.recommended,
    {
        files: ['**/*.{js,jsx}'], // Applies to all .js and jsx files
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: {
                ...globals.builtin,
                ...globals.serviceworker,
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            unicorn: eslintPluginUnicorn,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            'no-console': 'off', // Allows the use of console.log()
            'no-unused-vars': ['error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            'unicorn/prefer-module': 'warn',
            'unicorn/consistent-compound-words': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/filename-case': 'off',
            'unicorn/prefer-global-this': 'off',
            'unicorn/consistent-function-scoping': 'off',
            'unicorn/catch-error-name': 'off',
            'unicorn/no-for-each': 'off',
            'unicorn/number-literal-case': 'off',
            'unicorn/no-null': 'off',
            'unicorn/no-this-outside-of-class': 'off',
            'unicorn/no-declarations-before-early-exit': 'off',
            'unicorn/numeric-separators-style': 'off',
            'unicorn/prefer-early-return': 'off',
            'unicorn/prefer-query-selector': 'off',
            'unicorn/prefer-add-event-listener': 'off',
            'unicorn/prefer-private-class-fields': 'off',
            'unicorn/prefer-class-fields': 'off',
            'unicorn/no-static-only-class': 'off',
            'unicorn/no-empty-file': 'off',
            'unicorn/prefer-spread': 'off',

            // Unsure if this should be allowed
            'unicorn/no-global-object-property-assignment': 'off',

            // Not familiar with these
            'unicorn/prefer-export-from': 'off',
            'unicorn/no-computed-property-existence-check': 'off',
            'unicorn/prefer-string-replace-all': 'off',
            'unicorn/prefer-string-slice': 'off',
        },
    },
    {
        ignores: ['dist/**', 'build/**', 'assets/**', 'node_modules/'],
    },
]);