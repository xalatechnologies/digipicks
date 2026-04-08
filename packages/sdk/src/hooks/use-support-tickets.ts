/**
 * DigilistSaaS SDK - Support Ticket Hooks
 *
 * React hooks for the support/ticketing system.
 * Connected to Convex support functions.
 *
 * Queries:  { data, isLoading, error }
 * Mutations: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// =============================================================================
// Query Key Factory
// =============================================================================

export const supportTicketKeys = {
    all: ["support-tickets"] as const,
    list: (params?: Record<string, unknown>) => [...supportTicketKeys.all, "list", params] as const,
    detail: (id: string) => [...supportTicketKeys.all, "detail", id] as const,
    messages: (id: string) => [...supportTicketKeys.all, id, "messages"] as const,
    counts: () => [...supportTicketKeys.all, "counts"] as const,
};

// =============================================================================
// Types
// =============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'bug' | 'feature' | 'billing' | 'access' | 'other';
export type TicketMessageType = 'reply' | 'internal_note' | 'system';

export interface SupportTicket {
    id: string;
    tenantId: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    reporterUserId: string;
    reporterName?: string;
    reporterEmail?: string;
    reporterAvatar?: string;
    assigneeUserId?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    assigneeAvatar?: string;
    tags: string[];
    attachmentUrls: string[];
    resolvedAt?: string;
    closedAt?: string;
    firstResponseAt?: string;
    slaDeadline?: string;
    messageCount?: number;
    createdAt: string;
}

export interface SupportTicketMessage {
    id: string;
    ticketId: string;
    authorUserId: string;
    authorName?: string;
    authorAvatar?: string;
    body: string;
    type: TicketMessageType;
    attachmentUrls: string[];
    createdAt: string;
}

export interface SupportTicketCounts {
    all: number;
    open: number;
    in_progress: number;
    waiting: number;
    resolved: number;
    closed: number;
}

// =============================================================================
// Query Hooks
// =============================================================================

export function useSupportTickets(
    tenantId: Id<"tenants"> | undefined,
    params?: { status?: string; assigneeUserId?: string; category?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.support.listTickets,
        tenantId
            ? {
                  tenantId,
                  status: params?.status,
                  assigneeUserId: params?.assigneeUserId,
                  category: params?.category,
                  limit: params?.limit,
              }
            : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;

    const tickets: SupportTicket[] = (data ?? []).map((t: any) => ({
        id: t._id as string,
        tenantId: t.tenantId as string,
        subject: t.subject,
        description: t.description,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        category: t.category as TicketCategory,
        reporterUserId: t.reporterUserId as string,
        reporterName: t.reporterName,
        reporterEmail: t.reporterEmail,
        reporterAvatar: t.reporterAvatar,
        assigneeUserId: t.assigneeUserId as string | undefined,
        assigneeName: t.assigneeName,
        assigneeEmail: t.assigneeEmail,
        assigneeAvatar: t.assigneeAvatar,
        tags: t.tags ?? [],
        attachmentUrls: t.attachmentUrls ?? [],
        resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).toISOString() : undefined,
        closedAt: t.closedAt ? new Date(t.closedAt).toISOString() : undefined,
        firstResponseAt: t.firstResponseAt ? new Date(t.firstResponseAt).toISOString() : undefined,
        slaDeadline: t.slaDeadline ? new Date(t.slaDeadline).toISOString() : undefined,
        messageCount: t.messageCount,
        createdAt: new Date(t._creationTime).toISOString(),
    }));

    return {
        data: { data: tickets },
        tickets,
        isLoading,
        error: null,
    };
}

export function useSupportTicket(
    ticketId: string | undefined
) {
    const data = useConvexQuery(
        api.domain.support.getTicket,
        ticketId ? { id: ticketId } : "skip"
    );

    const isLoading = ticketId !== undefined && data === undefined;

    const ticket: SupportTicket | null = data
        ? {
              id: data._id as string,
              tenantId: data.tenantId as string,
              subject: data.subject,
              description: data.description,
              status: data.status as TicketStatus,
              priority: data.priority as TicketPriority,
              category: data.category as TicketCategory,
              reporterUserId: data.reporterUserId as string,
              reporterName: data.reporterName,
              reporterEmail: data.reporterEmail,
              reporterAvatar: data.reporterAvatar,
              assigneeUserId: data.assigneeUserId as string | undefined,
              assigneeName: data.assigneeName,
              assigneeEmail: data.assigneeEmail,
              assigneeAvatar: data.assigneeAvatar,
              tags: data.tags ?? [],
              attachmentUrls: data.attachmentUrls ?? [],
              resolvedAt: data.resolvedAt ? new Date(data.resolvedAt).toISOString() : undefined,
              closedAt: data.closedAt ? new Date(data.closedAt).toISOString() : undefined,
              firstResponseAt: data.firstResponseAt ? new Date(data.firstResponseAt).toISOString() : undefined,
              slaDeadline: data.slaDeadline ? new Date(data.slaDeadline).toISOString() : undefined,
              messageCount: data.messageCount,
              createdAt: new Date(data._creationTime).toISOString(),
          }
        : null;

    return {
        data: { data: ticket },
        ticket,
        isLoading,
        error: null,
    };
}

export function useSupportTicketMessages(
    ticketId: string | undefined,
    params?: { limit?: number }
) {
    const data = useConvexQuery(
        api.domain.support.listTicketMessages,
        ticketId ? { ticketId, limit: params?.limit } : "skip"
    );

    const isLoading = ticketId !== undefined && data === undefined;

    const messages: SupportTicketMessage[] = (data ?? []).map((m: any) => ({
        id: m._id as string,
        ticketId: m.ticketId as string,
        authorUserId: m.authorUserId as string,
        authorName: m.authorName,
        authorAvatar: m.authorAvatar,
        body: m.body,
        type: m.type as TicketMessageType,
        attachmentUrls: m.attachmentUrls ?? [],
        createdAt: new Date(m._creationTime).toISOString(),
    }));

    return {
        data: { data: messages },
        messages,
        isLoading,
        error: null,
    };
}

export function useSupportTicketCounts(
    tenantId: Id<"tenants"> | undefined
) {
    const data = useConvexQuery(
        api.domain.support.getTicketCounts,
        tenantId ? { tenantId } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;

    const counts: SupportTicketCounts = data ?? {
        all: 0,
        open: 0,
        in_progress: 0,
        waiting: 0,
        resolved: 0,
        closed: 0,
    };

    return {
        data: { data: counts },
        counts,
        isLoading,
        error: null,
    };
}

// =============================================================================
// Customer-Facing Hooks (Minside)
// =============================================================================

/**
 * Hook for a logged-in user to view their own support tickets.
 * Filters server-side by tenantId + reporterUserId.
 */
export function useMySupport(params: {
    tenantId: Id<"tenants"> | undefined;
    userId: Id<"users"> | undefined;
    limit?: number;
}) {
    const { tenantId, userId, limit } = params;

    const data = useConvexQuery(
        api.domain.support.listUserTickets,
        tenantId && userId
            ? { tenantId, reporterUserId: userId, limit }
            : "skip"
    );

    const isLoading = tenantId !== undefined && userId !== undefined && data === undefined;

    const tickets: SupportTicket[] = (data ?? []).map((t: any) => ({
        id: t._id as string,
        tenantId: t.tenantId as string,
        subject: t.subject,
        description: t.description,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        category: t.category as TicketCategory,
        reporterUserId: t.reporterUserId as string,
        reporterName: t.reporterName,
        reporterEmail: t.reporterEmail,
        reporterAvatar: t.reporterAvatar,
        assigneeUserId: t.assigneeUserId as string | undefined,
        assigneeName: t.assigneeName,
        tags: t.tags ?? [],
        attachmentUrls: t.attachmentUrls ?? [],
        resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).toISOString() : undefined,
        closedAt: t.closedAt ? new Date(t.closedAt).toISOString() : undefined,
        firstResponseAt: t.firstResponseAt ? new Date(t.firstResponseAt).toISOString() : undefined,
        slaDeadline: t.slaDeadline ? new Date(t.slaDeadline).toISOString() : undefined,
        messageCount: t.messageCount,
        createdAt: new Date(t._creationTime).toISOString(),
    }));

    return {
        data: { data: tickets },
        tickets,
        isLoading,
        error: null,
    };
}

/**
 * Alias for useChangeSupportTicketStatus with close action.
 */
export function useCloseSupportTicket() {
    const changeFn = useConvexMutation(api.domain.support.changeStatus);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: { id: string }) => {
        isLoading = true;
        error = null;
        try {
            const result = await changeFn({ id: args.id, status: "closed" });
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

/**
 * Alias for useAddSupportTicketMessage for simple customer replies.
 */
export function useReplySupportTicket() {
    const mutationFn = useConvexMutation(api.domain.support.addMessage);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        tenantId: Id<"tenants">;
        ticketId: string;
        authorUserId: Id<"users">;
        body: string;
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn({
                ...args,
                type: "reply",
            });
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateSupportTicket() {
    const mutationFn = useConvexMutation(api.domain.support.createTicket);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        tenantId: Id<"tenants">;
        subject: string;
        description: string;
        priority: string;
        category: string;
        reporterUserId: Id<"users">;
        tags?: string[];
        attachmentUrls?: string[];
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

export function useUpdateSupportTicket() {
    const mutationFn = useConvexMutation(api.domain.support.updateTicket);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        id: string;
        subject?: string;
        description?: string;
        category?: string;
        priority?: string;
        tags?: string[];
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

export function useAssignSupportTicket() {
    const mutationFn = useConvexMutation(api.domain.support.assignTicket);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        id: string;
        assigneeUserId: Id<"users">;
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

export function useChangeSupportTicketStatus() {
    const mutationFn = useConvexMutation(api.domain.support.changeStatus);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        id: string;
        status: string;
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

export function useAddSupportTicketMessage() {
    const mutationFn = useConvexMutation(api.domain.support.addMessage);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        tenantId: Id<"tenants">;
        ticketId: string;
        authorUserId: Id<"users">;
        body: string;
        type: string;
        attachmentUrls?: string[];
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

export function useEscalateSupportTicket() {
    const mutationFn = useConvexMutation(api.domain.support.escalateTicket);
    let isLoading = false;
    let error: Error | null = null;
    let isSuccess = false;

    const mutateAsync = async (args: {
        id: string;
        userId: Id<"users">;
        newPriority?: string;
        newAssigneeUserId?: Id<"users">;
    }) => {
        isLoading = true;
        error = null;
        try {
            const result = await mutationFn(args);
            isSuccess = true;
            return result;
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            isLoading = false;
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}
