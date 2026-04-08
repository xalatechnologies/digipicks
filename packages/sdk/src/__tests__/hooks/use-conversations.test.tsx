/**
 * use-conversations Hook Tests
 *
 * Tests for messaging hooks: query keys, conversation listing,
 * message fetching, unread counts, and mutation operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    MOCK_TENANT_ID,
    MOCK_USER_ID,
    mockConvexClient,
} from '../mocks/convex';

vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import {
    conversationKeys,
    useConversations,
    useMessages,
    useUnreadMessageCount,
    useCreateConversation,
    useSendMessage,
    useMarkMessagesAsRead,
    useArchiveConversation,
    useResolveConversation,
    useAssignConversation,
} from '@/hooks/use-conversations';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockConversation = {
    _id: 'conv-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    userId: MOCK_USER_ID,
    participants: [MOCK_USER_ID],
    subject: 'Booking spørsmål',
    status: 'open',
    unreadCount: 2,
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
};

const mockMessage = {
    _id: 'msg-001',
    _creationTime: Date.now(),
    conversationId: 'conv-001',
    senderId: MOCK_USER_ID,
    senderType: 'user',
    content: 'Hei, jeg har et spørsmål',
    messageType: 'text',
    attachments: [],
    sentAt: new Date().toISOString(),
};

describe('conversationKeys', () => {
    it('generates stable query key roots', () => {
        expect(conversationKeys.all).toEqual(['conversations']);
        expect(conversationKeys.unread()).toContain('conversations');
        expect(conversationKeys.unread()).toContain('unread');
        expect(conversationKeys.detail('conv-001')).toContain('conv-001');
        expect(conversationKeys.messages('conv-001')).toContain('conv-001');
    });
});

describe('useConversations', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useConversations(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data?.data).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('maps Convex conversations to Conversation shape', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockConversation]);

        const { result } = renderHook(
            () => useConversations(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);

        const conv = result.current.data!.data[0];
        expect(conv.id).toBe('conv-001');
        expect(conv.subject).toBe('Booking spørsmål');
        expect(conv.status).toBe('open');
        expect(conv.unreadCount).toBe(2);
    });

    it('skips query when userId is missing', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useConversations(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useMessages', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useMessages('conv-001' as never),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data?.data).toEqual([]);
    });

    it('maps Convex messages to Message shape', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockMessage]);

        const { result } = renderHook(
            () => useMessages('conv-001' as never),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);

        const msg = result.current.data!.data[0];
        expect(msg.id).toBe('msg-001');
        expect(msg.content).toBe('Hei, jeg har et spørsmål');
        expect(msg.senderType).toBe('user');
    });

    it('skips query when conversationId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useMessages(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useUnreadMessageCount', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns count 0 wrapped in data.data when no unread messages', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 0 });

        const { result } = renderHook(
            () => useUnreadMessageCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        // Returns { data: { data: { count: number } }, isLoading, error }
        expect(result.current.data.data.count).toBe(0);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns count wrapped in data.data when there are unread messages', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 3 });

        const { result } = renderHook(
            () => useUnreadMessageCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.data.count).toBe(3);
    });

    it('skips query when userId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useUnreadMessageCount(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useCreateConversation', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'conv-new' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });
});

describe('useSendMessage', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'msg-new' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useMarkMessagesAsRead', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useMarkMessagesAsRead(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useArchiveConversation', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useArchiveConversation(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
    });
});

describe('useResolveConversation', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useResolveConversation(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
    });
});

describe('useAssignConversation', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useAssignConversation(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
    });
});
