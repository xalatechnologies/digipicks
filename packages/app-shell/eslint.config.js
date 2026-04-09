import { packages } from '@digipicks/eslint-config';

export default [
  ...packages,
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**'],
  },
];
