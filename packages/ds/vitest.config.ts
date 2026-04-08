import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        environmentMatchGlobs: [
            ['src/**/*.test.tsx', 'jsdom'],
        ],
        root: path.resolve(__dirname),
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        setupFiles: ['./src/__tests__/setup.ts'],
        css: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
