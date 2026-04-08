import { packages } from '@digilist-saas/eslint-config';

export default [
    ...packages,
    {
        ignores: ['dist/**', 'build/**', 'node_modules/**'],
    },
];
