import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
        exclude: ['tests/rls/**'],
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            include: ['packages/xala-sdk/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/node_modules/**'],
        },
        reporters: ['verbose'],
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true, // Ensure DB tests don't conflict
            },
        },
    },
});
