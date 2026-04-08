/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for Convex function tests.
 *
 * Uses edge-runtime to match the Convex worker environment.
 * convex-test must be inlined so Vite resolves it correctly.
 *
 * Run with:  npx vitest --config convex/vitest.config.ts
 *        or: pnpm test:convex:unit (once script is added)
 */
export default defineConfig({
    test: {
        environment: "edge-runtime",
        setupFiles: ["./vitest.setup.ts"],
        // Use forks to fully isolate each test file in a separate process.
        // convex-test uses a global singleton (TransactionManager) that leaks
        // state between test files when running in the default thread pool.
        pool: "forks",
        server: {
            deps: {
                inline: ["convex-test"],
            },
        },
        include: [
            "components/**/*.test.ts",
            "lib/**/*.test.ts",
            "domain/__tests__/**/*.test.ts",
        ],
        exclude: [
            "_generated/**",
            "node_modules/**",
        ],
        testTimeout: 30_000,
        // Retry flaky tests once. convex-test's global TransactionManager
        // occasionally causes non-deterministic failures in concurrent suites.
        retry: 1,
        fileParallelism: false,
        reporters: ["verbose"],
    },
});
