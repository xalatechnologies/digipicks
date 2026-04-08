import { apps } from '@digilist-saas/eslint-config';

export default [
  ...apps,
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', 'dev-dist/**'],
  },
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
