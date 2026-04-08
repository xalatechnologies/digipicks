/**
 * useAuth Hook Tests
 *
 * Tests for the unified auth hook using Convex mutations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    mockConvexClient,
    mockAuthSuccessResponse,
} from '../mocks/convex';

// Mock convex/react module
vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return {
        ...actual,
        useMutation: vi.fn(),
        useAction: vi.fn(),
        useQuery: vi.fn(),
    };
});

// Mock the cached hooks wrapper (used by SDK hooks)
vi.mock('@/hooks/convex-utils', async () => {
    return {
        useQuery: vi.fn(),
        useMutation: vi.fn(),
        useAction: vi.fn(),
    };
});

import { useMutation, useAction, useQuery } from 'convex/react';
import { useMutation as useCachedMutation, useQuery as useCachedQuery, useAction as useCachedAction } from '@/hooks/convex-utils';
import { useAuth } from '@/hooks/use-auth';

// Test wrapper with ConvexProvider
const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>
            {children}
        </ConvexProvider>
    );
};

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should start with no user when localStorage is empty', () => {
        const mockSignIn = vi.fn();
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn();
        vi.mocked(useCachedMutation)
            .mockReturnValueOnce(mockSignIn as never)
            .mockReturnValueOnce(mockDemo as never)
            .mockReturnValueOnce(mockDeleteSession as never);
        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should restore user from localStorage on mount', () => {
        const storedUser = { id: 'u1', email: 'test@example.com', name: 'Test' };
        localStorage.setItem('digilist_saas_user', JSON.stringify(storedUser));
        localStorage.setItem('digilist_saas_session_token', 'test-token');

        const mockSignIn = vi.fn();
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn();
        vi.mocked(useCachedMutation)
            .mockReturnValueOnce(mockSignIn as never)
            .mockReturnValueOnce(mockDemo as never)
            .mockReturnValueOnce(mockDeleteSession as never);
        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        // Mock query to return valid session
        vi.mocked(useCachedQuery).mockReturnValue({ user: storedUser, tenant: null } as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        expect(result.current.user).toEqual(storedUser);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('should sign in with password via Convex mutation', async () => {
        const mockSignIn = vi.fn().mockResolvedValue(mockAuthSuccessResponse);
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn();

        // Mock useCachedMutation to return the correct function based on call order
        // Use modulo to handle re-renders
        let callCount = 0;
        vi.mocked(useCachedMutation).mockImplementation((() => {
            const mocks = [mockSignIn, mockDemo, mockDeleteSession];
            const mock = mocks[callCount % 3];
            callCount++;
            return mock;
        }) as never);

        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.signIn('test@example.com', 'password123');
        });

        expect(mockSignIn).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            appId: 'default',
        });
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.email).toBe('test@example.com');
    });

    it('should handle sign in failure', async () => {
        const mockSignIn = vi.fn().mockResolvedValue({
            success: false,
            error: 'Invalid credentials',
        });
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn();

        let callCount = 0;
        vi.mocked(useCachedMutation).mockImplementation((() => {
            const mocks = [mockSignIn, mockDemo, mockDeleteSession];
            const mock = mocks[callCount % 3];
            callCount++;
            return mock;
        }) as never);

        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            try {
                await result.current.signIn('wrong@example.com', 'bad');
            } catch {
                // Expected
            }
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error?.message).toBe('Invalid credentials');
    });

    it('should sign in as demo via Convex mutation', async () => {
        const mockSignIn = vi.fn();
        const mockDemo = vi.fn().mockResolvedValue(mockAuthSuccessResponse);
        const mockDeleteSession = vi.fn();

        let callCount = 0;
        vi.mocked(useCachedMutation).mockImplementation((() => {
            const mocks = [mockSignIn, mockDemo, mockDeleteSession];
            const mock = mocks[callCount % 3];
            callCount++;
            return mock;
        }) as never);

        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.signInAsDemo();
        });

        expect(mockDemo).toHaveBeenCalledWith({ appId: 'default' });
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('should sign out and clear localStorage', async () => {
        const storedUser = { id: 'u1', email: 'test@example.com', name: 'Test' };
        localStorage.setItem('digilist_saas_user', JSON.stringify(storedUser));
        localStorage.setItem('digilist_saas_session_token', 'token');

        const mockSignIn = vi.fn();
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useCachedMutation)
            .mockReturnValueOnce(mockSignIn as never)
            .mockReturnValueOnce(mockDemo as never)
            .mockReturnValueOnce(mockDeleteSession as never);
        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        // Mock query to return valid session initially
        vi.mocked(useCachedQuery).mockReturnValue({ user: storedUser, tenant: null } as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        expect(result.current.isAuthenticated).toBe(true);

        await act(async () => {
            await result.current.signOut();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('digilist_saas_user')).toBeNull();
        expect(localStorage.getItem('digilist_saas_session_token')).toBeNull();
    });

    it('should expose signIn, signInAsDemo, signInWithOAuth, and signOut functions', () => {
        const mockSignIn = vi.fn();
        const mockDemo = vi.fn();
        const mockDeleteSession = vi.fn();
        vi.mocked(useCachedMutation)
            .mockReturnValueOnce(mockSignIn as never)
            .mockReturnValueOnce(mockDemo as never)
            .mockReturnValueOnce(mockDeleteSession as never);
        vi.mocked(useCachedAction).mockReturnValue(vi.fn() as never);
        vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper(),
        });

        expect(typeof result.current.signIn).toBe('function');
        expect(typeof result.current.signInAsDemo).toBe('function');
        expect(typeof result.current.signInWithOAuth).toBe('function');
        expect(typeof result.current.signOut).toBe('function');
    });
});
