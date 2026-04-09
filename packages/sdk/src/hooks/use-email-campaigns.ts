/**
 * DigilistSaaS SDK - Email Campaigns Hooks
 *
 * React hooks for email campaign operations, wired to Convex backend.
 * Supports transactional and marketing email campaigns with segmentation
 * and analytics tracking.
 *
 * Query hooks: { data, campaigns, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export type CampaignType = "transactional" | "marketing" | "announcement";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type RecipientStatus = "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed";
export type SegmentType = "all" | "tier" | "active" | "inactive" | "custom";

export interface CampaignSegment {
    type: SegmentType;
    tierId?: string;
    activeSinceDays?: number;
    inactiveSinceDays?: number;
    tags?: string[];
}

export interface EmailCampaign {
    id: string;
    tenantId: string;
    creatorId: string;
    name: string;
    subject: string;
    body: string;
    preheader?: string;
    templateCategory?: string;
    campaignType: CampaignType;
    segment: CampaignSegment;
    status: CampaignStatus;
    scheduledAt?: number;
    sentAt?: number;
    completedAt?: number;
    recipientCount: number;
    sentCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    creator?: { id: string; name?: string; displayName?: string };
}

export interface CampaignRecipient {
    id: string;
    campaignId: string;
    userId: string;
    email: string;
    status: RecipientStatus;
    sentAt?: number;
    openedAt?: number;
    clickedAt?: number;
    bouncedAt?: number;
    bounceReason?: string;
    unsubscribedAt?: number;
    resendId?: string;
    user?: { id: string; name?: string; displayName?: string };
}

export interface CampaignAnalytics {
    campaignId: string;
    totalRecipients: number;
    breakdown: Record<string, number>;
}

export interface CreateCampaignInput {
    tenantId: Id<"tenants">;
    creatorId: Id<"users">;
    name: string;
    subject: string;
    body: string;
    preheader?: string;
    templateCategory?: string;
    campaignType: CampaignType;
    segment: CampaignSegment;
    metadata?: Record<string, unknown>;
}

export interface SendCampaignInput {
    tenantId: Id<"tenants">;
    campaignId: string;
    creatorId: Id<"users">;
}

// ============================================================================
// Transform
// ============================================================================

function transformCampaign(raw: any): EmailCampaign {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId,
        creatorId: raw.creatorId,
        name: raw.name,
        subject: raw.subject,
        body: raw.body,
        preheader: raw.preheader,
        templateCategory: raw.templateCategory,
        campaignType: raw.campaignType,
        segment: raw.segment,
        status: raw.status,
        scheduledAt: raw.scheduledAt,
        sentAt: raw.sentAt,
        completedAt: raw.completedAt,
        recipientCount: raw.recipientCount,
        sentCount: raw.sentCount,
        openCount: raw.openCount,
        clickCount: raw.clickCount,
        bounceCount: raw.bounceCount,
        unsubscribeCount: raw.unsubscribeCount,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
        creator: raw.creator,
    };
}

function transformRecipient(raw: any): CampaignRecipient {
    return {
        id: raw._id as string,
        campaignId: raw.campaignId,
        userId: raw.userId,
        email: raw.email,
        status: raw.status,
        sentAt: raw.sentAt,
        openedAt: raw.openedAt,
        clickedAt: raw.clickedAt,
        bouncedAt: raw.bouncedAt,
        bounceReason: raw.bounceReason,
        unsubscribedAt: raw.unsubscribedAt,
        resendId: raw.resendId,
        user: raw.user,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List email campaigns for a tenant.
 * Connected to: api.domain.emailCampaigns.list
 */
export function useEmailCampaigns(
    tenantId: Id<"tenants"> | undefined,
    params?: { status?: string; campaignType?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.emailCampaigns.list,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const campaigns: EmailCampaign[] = (data ?? []).map(transformCampaign);

    return { data: campaigns, campaigns, isLoading, error: null };
}

/**
 * Get a single campaign.
 * Connected to: api.domain.emailCampaigns.get
 */
export function useEmailCampaign(campaignId: string | undefined) {
    const data = useConvexQuery(
        api.domain.emailCampaigns.get,
        campaignId ? { id: campaignId } : "skip"
    );

    const isLoading = campaignId !== undefined && data === undefined;
    const campaign = data ? transformCampaign(data) : null;

    return { data: campaign, campaign, isLoading, error: null };
}

/**
 * Get campaign analytics.
 * Connected to: api.domain.emailCampaigns.getAnalytics
 */
export function useCampaignAnalytics(campaignId: string | undefined) {
    const data = useConvexQuery(
        api.domain.emailCampaigns.getAnalytics,
        campaignId ? { campaignId } : "skip"
    );

    const isLoading = campaignId !== undefined && data === undefined;

    return {
        data: data as CampaignAnalytics | null,
        analytics: data as CampaignAnalytics | null,
        isLoading,
        error: null,
    };
}

/**
 * List recipients for a campaign.
 * Connected to: api.domain.emailCampaigns.listRecipients
 */
export function useCampaignRecipients(
    campaignId: string | undefined,
    params?: { status?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.emailCampaigns.listRecipients,
        campaignId ? { campaignId, ...params } : "skip"
    );

    const isLoading = campaignId !== undefined && data === undefined;
    const recipients: CampaignRecipient[] = (data ?? []).map(transformRecipient);

    return { data: recipients, recipients, isLoading, error: null };
}

/**
 * Check if a user is unsubscribed from marketing emails.
 * Connected to: api.domain.emailCampaigns.isUnsubscribed
 */
export function useIsUnsubscribed(
    tenantId: Id<"tenants"> | undefined,
    email: string | undefined
) {
    const data = useConvexQuery(
        api.domain.emailCampaigns.isUnsubscribed,
        tenantId && email ? { tenantId, email } : "skip"
    );

    const isLoading = tenantId !== undefined && email !== undefined && data === undefined;

    return { data: data ?? false, isUnsubscribed: data ?? false, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new email campaign.
 * Connected to: api.domain.emailCampaigns.create
 */
export function useCreateEmailCampaign() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.create);

    return {
        mutate: (input: CreateCampaignInput) => mutation(input),
        mutateAsync: async (input: CreateCampaignInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Send an email campaign immediately.
 * Connected to: api.domain.emailCampaigns.sendCampaign
 */
export function useSendEmailCampaign() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.sendCampaign);

    return {
        mutate: (input: SendCampaignInput) => mutation(input),
        mutateAsync: async (input: SendCampaignInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Schedule an email campaign.
 * Connected to: api.domain.emailCampaigns.schedule
 */
export function useScheduleEmailCampaign() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.schedule);

    return {
        mutate: (input: { id: string; scheduledAt: number }) => mutation(input),
        mutateAsync: async (input: { id: string; scheduledAt: number }) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Cancel an email campaign.
 * Connected to: api.domain.emailCampaigns.cancel
 */
export function useCancelEmailCampaign() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.cancel);

    return {
        mutate: (input: { id: string }) => mutation(input),
        mutateAsync: async (input: { id: string }) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Update a draft email campaign.
 * Connected to: api.domain.emailCampaigns.update
 */
export function useUpdateEmailCampaign() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.update);

    return {
        mutate: (input: { id: string } & Partial<Omit<CreateCampaignInput, "tenantId" | "creatorId">>) =>
            mutation(input),
        mutateAsync: async (input: { id: string } & Partial<Omit<CreateCampaignInput, "tenantId" | "creatorId">>) =>
            mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Unsubscribe from marketing emails.
 * Connected to: api.domain.emailCampaigns.unsubscribe
 */
export function useUnsubscribeEmail() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.unsubscribe);

    return {
        mutate: (input: { tenantId: Id<"tenants">; userId: Id<"users">; email: string; reason?: string }) =>
            mutation(input),
        mutateAsync: async (input: { tenantId: Id<"tenants">; userId: Id<"users">; email: string; reason?: string }) =>
            mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Resubscribe to marketing emails.
 * Connected to: api.domain.emailCampaigns.resubscribe
 */
export function useResubscribeEmail() {
    const mutation = useConvexMutation(api.domain.emailCampaigns.resubscribe);

    return {
        mutate: (input: { tenantId: Id<"tenants">; email: string }) =>
            mutation(input),
        mutateAsync: async (input: { tenantId: Id<"tenants">; email: string }) =>
            mutation(input),
        isLoading: false,
        error: null,
    };
}
