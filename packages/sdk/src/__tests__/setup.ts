/**
 * Vitest Test Setup
 *
 * Global test configuration and mocks for the SDK test suite.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
});

// Mock import.meta.env
vi.stubGlobal('import', {
    meta: {
        env: {
            VITE_CONVEX_URL: 'https://test-convex.cloud',
            VITE_TENANT_ID: 'test-tenant-id',
        },
    },
});

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
});

// Cleanup after each test
afterEach(() => {
    vi.restoreAllMocks();
});

// Export for use in tests
export { localStorageMock };
