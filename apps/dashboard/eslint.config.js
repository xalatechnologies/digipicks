import { apps } from '@digilist-saas/eslint-config';
import react from 'eslint-plugin-react';

export default [
    ...apps,
    {
        ignores: ['dist/**', 'build/**', 'node_modules/**'],
    },
    {
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.tsx', '**/*.jsx'],
        plugins: { react },
        rules: {
            // Downgrade to warnings until codebase is cleaned up
            'react/forbid-dom-props': ['warn', { forbid: ['style'] }],
            'xala/no-hardcoded-strings': 'warn',
        },
    },
];
