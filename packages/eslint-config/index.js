/**
 * @digilist-saas/eslint-config - Shared ESLint configuration
 *
 * ESLint v9 flat config format for the Xala monorepo.
 *
 * DS Standards rules (no raw HTML, no inline style, no inline SVG, i18n):
 * - react/no-danger: no dangerouslySetInnerHTML
 * - react/forbid-dom-props: no inline style — use module.css + tokens
 * - xala/no-inline-svg: use @digilist-saas/ds Icon components
 * - xala/no-hardcoded-colors: no rgb/rgba/hex in style — use var(--ds-*)
 * - xala/no-direct-digdir: use @digilist-saas/ds or platform-ui
 * - xala/no-raw-html: no <p>, <h1>–<h6>, <label>, <strong> etc. — use DS primitives
 * - xala/require-css-modules: no plain .css — use .module.css
 * - xala/no-hardcoded-strings: use t() for user-facing strings
 * - xala/no-deprecated-spacing: no --ds-spacing-* or --digilist-spacing-* — use --ds-size-*
 * - xala/no-hardcoded-pixels: prefer design tokens over hardcoded px in inline styles
 *
 * Theme: colors from themes only; max reuse of Digdir tokens.
 * module.css per component: enforced via require-css-modules.
 * See docs/DS_STANDARDS_IMPLEMENTATION_PLAN.md.
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import react from 'eslint-plugin-react';
import noDirectDigdir from '../../scripts/eslint-rules/no-direct-digdir.js';
import noInlineSvg from '../../scripts/eslint-rules/no-inline-svg.js';
import noHardcodedColors from '../../scripts/eslint-rules/no-hardcoded-colors.js';
import noRawHtml from '../../scripts/eslint-rules/no-raw-html.js';
import requireCssModules from '../../scripts/eslint-rules/require-css-modules.js';
import noHardcodedStrings from '../../scripts/eslint-rules/no-hardcoded-strings.js';
import noDeprecatedSpacing from '../../scripts/eslint-rules/no-deprecated-spacing.js';
import noHardcodedPixels from '../../scripts/eslint-rules/no-hardcoded-pixels.js';
import noAppLocalAuth from '../../scripts/eslint-rules/no-app-local-auth.js';
import preferDsComponents from '../../scripts/eslint-rules/prefer-ds-components.js';

// eslint-plugin-i18next requires parserServices (TypeScript); disabled until parser setup is fixed
// Convention: use t() for user-facing strings — see docs/DS_STANDARDS_IMPLEMENTATION_PLAN.md

const xalaPlugin = {
    rules: {
        'no-direct-digdir': noDirectDigdir,
        'no-inline-svg': noInlineSvg,
        'no-hardcoded-colors': noHardcodedColors,
        'no-raw-html': noRawHtml,
        'require-css-modules': requireCssModules,
        'no-hardcoded-strings': noHardcodedStrings,
        'no-deprecated-spacing': noDeprecatedSpacing,
        'no-hardcoded-pixels': noHardcodedPixels,
        'no-app-local-auth': noAppLocalAuth,
        'prefer-ds-components': preferDsComponents,
    },
};

// Base config for all projects
export const base = [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
        },
        rules: {
            // TypeScript-specific rules
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'off',

            // General rules
            'no-console': 'warn',
            'prefer-const': 'error',
        },
    },
];

// Config for apps (React/Vite) and packages/digilist
export const apps = [
    ...base,
    {
        files: ['**/*.tsx', '**/*.jsx'],
        plugins: {
            xala: xalaPlugin,
            react,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // React-specific rules
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',

            // ---------- DS Standards ----------

            // UI Guardrails: no direct @digdir imports — use @digilist-saas/ds or platform-ui
            'xala/no-direct-digdir': 'error',

            // DS Standards: no dangerouslySetInnerHTML
            'react/no-danger': 'error',

            // DS Standards: no inline style — use module.css and design tokens
            'react/forbid-dom-props': ['error', { forbid: ['style'] }],

            // DS Standards: no inline SVG — use @digilist-saas/ds Icon components
            'xala/no-inline-svg': 'error',

            // DS Standards: no rgb/rgba/hex in style — use design tokens
            'xala/no-hardcoded-colors': 'error',

            // DS Standards: no raw HTML elements — use Paragraph, Heading, Label, etc.
            'xala/no-raw-html': 'error',

            // DS Standards: no plain .css imports — use .module.css
            'xala/require-css-modules': 'error',

            // Localization: no hardcoded user-facing strings — use t()
            'xala/no-hardcoded-strings': 'error',

            // DS Standards: no deprecated --ds-spacing-* or --digilist-spacing-* — use --ds-size-*
            'xala/no-deprecated-spacing': 'error',

            // DS Standards: prefer design tokens over hardcoded px values in inline styles
            'xala/no-hardcoded-pixels': 'warn',

            // Security Invariants: no app-local AuthProvider/useAuth — use @digilist-saas/app-shell
            'xala/no-app-local-auth': 'error',

            // DS Standards: prefer DS components over raw semantic HTML
            'xala/prefer-ds-components': 'warn',
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },
    {
        ignores: [
            'dist/**',
            'build/**',
            'node_modules/**',
            '.vite/**',
            'dev-dist/**',
            'public/service-worker.js',
            '**/workbox-*.js',
        ],
    },
];

// Config for packages (libraries)
export const packages = [
    ...base,
    {
        ignores: ['dist/**', 'build/**', 'node_modules/**'],
    },
];

export default { base, apps, packages };
