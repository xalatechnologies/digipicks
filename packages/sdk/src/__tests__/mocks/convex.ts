/**
 * Convex Mock Utilities
 *
 * Provides mock implementations for Convex client and hooks for testing.
 */

import { vi } from 'vitest';
import type { TenantId, ResourceId, UserId } from '@/convex-api';

// Mock tenant ID for testing
export const MOCK_TENANT_ID = 'k17abc123' as TenantId;
export const MOCK_RESOURCE_ID = 'k17res456' as ResourceId;
export const MOCK_USER_ID = 'k17user001' as UserId;

// Mock resource data
export const mockResources = [
    {
        _id: 'k17res001' as ResourceId,
        _creationTime: Date.now(),
        tenantId: MOCK_TENANT_ID,
        organizationId: undefined,
        name: 'Meeting Room A',
        slug: 'meeting-room-a',
        description: 'Large meeting room with projector',
        categoryKey: 'LOKALER',
        timeMode: 'PERIOD',
        features: ['projector', 'whiteboard'],
        status: 'published',
        requiresApproval: false,
        capacity: 20,
        inventoryTotal: 1,
        images: [],
        pricing: {},
        metadata: {},
    },
    {
        _id: 'k17res002' as ResourceId,
        _creationTime: Date.now(),
        tenantId: MOCK_TENANT_ID,
        organizationId: undefined,
        name: 'Conference Room B',
        slug: 'conference-room-b',
        description: 'Small conference room',
        categoryKey: 'LOKALER',
        timeMode: 'PERIOD',
        features: ['tv'],
        status: 'published',
        requiresApproval: true,
        capacity: 8,
        inventoryTotal: 1,
        images: [],
        pricing: {},
        metadata: {},
    },
];

// Mock user data
export const mockUser = {
    id: MOCK_USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: MOCK_TENANT_ID,
};

// Mock Convex useQuery hook
export const createMockUseQuery = <T>(data: T | undefined = undefined) => {
    return vi.fn().mockReturnValue(data);
};

// Mock Convex useMutation hook
export const createMockUseMutation = <T>(result: T) => {
    const mutationFn = vi.fn().mockResolvedValue(result);
    return vi.fn().mockReturnValue(mutationFn);
};

// Mock Convex client
export const mockConvexClient = {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
};

// Mock successful auth response
export const mockAuthSuccessResponse = {
    success: true,
    user: mockUser,
    sessionToken: 'test-session-token-123',
    tenant: { id: MOCK_TENANT_ID },
};

// Mock failed auth response
export const mockAuthFailureResponse = {
    success: false,
    error: 'Invalid credentials',
};
