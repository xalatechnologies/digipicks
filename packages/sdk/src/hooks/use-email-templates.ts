/**
 * DigilistSaaS SDK - Email Templates & Form Definitions Hooks
 *
 * Hooks for fetching email templates and form definitions
 * from the notifications component via Convex.
 */

import { useQuery, useMutation } from "./convex-utils";
import { api, type TenantId } from "../convex-api";
import { useResolveTenantId } from "./use-tenant-id";

// =============================================================================
// TYPES
// =============================================================================

export interface EmailTemplate {
    id: string;
    tenantId: string;
    name: string;
    subject?: string;
    body: string;
    category: string;
    channel: string; // "email" | "sms"
    isActive: boolean;
    isDefault?: boolean;
    lastModified?: number;
    modifiedBy?: string;
    sendCount?: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface FormField {
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
}

export interface FormDefinition {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    category: string;
    fields: FormField[];
    isPublished: boolean;
    submissionCount?: number;
    successMessage?: string;
    lastModified?: number;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

interface UseEmailTemplatesResult {
    templates: EmailTemplate[];
    isLoading: boolean;
    error: Error | null;
}

/**
 * Fetch all email templates for the current tenant.
 */
export function useEmailTemplates(
    options?: { tenantId?: string }
): UseEmailTemplatesResult {
    const tenantId = useResolveTenantId(options?.tenantId as TenantId | undefined);

    const raw = useQuery(
        api.domain.notifications.listEmailTemplates,
        tenantId ? { tenantId } : "skip"
    );

    const isLoading = tenantId !== undefined && raw === undefined;

    const templates: EmailTemplate[] = (raw ?? []).map((t: Record<string, unknown>) => ({
        id: t._id as string,
        tenantId: t.tenantId as string,
        name: (t.name as string) ?? "",
        subject: t.subject as string | undefined,
        body: (t.body as string) ?? "",
        category: (t.category as string) ?? "",
        channel: (t.channel as string) ?? "email",
        isActive: (t.isActive as boolean) ?? false,
        isDefault: t.isDefault as boolean | undefined,
        lastModified: t.lastModified as number | undefined,
        modifiedBy: t.modifiedBy as string | undefined,
        sendCount: t.sendCount as number | undefined,
        metadata: t.metadata as Record<string, unknown> | undefined,
        createdAt: new Date(t._creationTime as number).toISOString(),
    }));

    return { templates, isLoading, error: null };
}

interface UseFormDefinitionsResult {
    forms: FormDefinition[];
    isLoading: boolean;
    error: Error | null;
}

/**
 * Fetch all form definitions for the current tenant.
 */
export function useFormDefinitions(
    options?: { tenantId?: string }
): UseFormDefinitionsResult {
    const tenantId = useResolveTenantId(options?.tenantId as TenantId | undefined);

    const raw = useQuery(
        api.domain.notifications.listFormDefinitions,
        tenantId ? { tenantId } : "skip"
    );

    const isLoading = tenantId !== undefined && raw === undefined;

    const forms: FormDefinition[] = (raw ?? []).map((f: Record<string, unknown>) => ({
        id: f._id as string,
        tenantId: f.tenantId as string,
        name: (f.name as string) ?? "",
        description: f.description as string | undefined,
        category: (f.category as string) ?? "",
        fields: ((f.fields as Array<Record<string, unknown>>) ?? []).map((field) => ({
            id: field.id as string,
            type: field.type as string,
            label: field.label as string,
            required: field.required as boolean,
            options: field.options as string[] | undefined,
        })),
        isPublished: (f.isPublished as boolean) ?? false,
        submissionCount: f.submissionCount as number | undefined,
        successMessage: f.successMessage as string | undefined,
        lastModified: f.lastModified as number | undefined,
        createdAt: new Date(f._creationTime as number).toISOString(),
        metadata: f.metadata as Record<string, unknown> | undefined,
    }));

    return { forms, isLoading, error: null };
}

// =============================================================================
// MUTATION HOOKS — Email Templates
// =============================================================================

export interface CreateEmailTemplateInput {
    tenantId: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    isActive: boolean;
    modifiedBy?: string;
}

/** Create a new email template. */
export function useCreateEmailTemplate() {
    const mutation = useMutation(api.domain.notifications.createEmailTemplate);
    const create = async (input: CreateEmailTemplateInput): Promise<{ id: string }> => {
        const result = await mutation(input);
        return { id: result.id };
    };
    return { createEmailTemplate: create };
}

export interface UpdateEmailTemplateInput {
    id: string;
    name?: string;
    subject?: string;
    body?: string;
    category?: string;
    isActive?: boolean;
    modifiedBy?: string;
}

/** Update an existing email template. */
export function useUpdateEmailTemplate() {
    const mutation = useMutation(api.domain.notifications.updateEmailTemplate);
    const update = async (input: UpdateEmailTemplateInput): Promise<{ success: boolean }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation(input as any);
        return { success: result.success };
    };
    return { updateEmailTemplate: update };
}

/** Delete an email template. */
export function useDeleteEmailTemplate() {
    const mutation = useMutation(api.domain.notifications.deleteEmailTemplate);
    const remove = async (id: string): Promise<{ success: boolean }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation({ id } as any);
        return { success: result.success };
    };
    return { deleteEmailTemplate: remove };
}

// =============================================================================
// MUTATION HOOKS — Form Definitions
// =============================================================================

export interface CreateFormDefinitionInput {
    tenantId: string;
    name: string;
    description?: string;
    category: string;
    fields: FormField[];
    isPublished: boolean;
    successMessage?: string;
}

/** Create a new form definition. */
export function useCreateFormDefinition() {
    const mutation = useMutation(api.domain.notifications.createFormDefinition);
    const create = async (input: CreateFormDefinitionInput): Promise<{ id: string }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation(input as any);
        return { id: result.id };
    };
    return { createFormDefinition: create };
}

export interface UpdateFormDefinitionInput {
    id: string;
    name?: string;
    description?: string;
    category?: string;
    fields?: FormField[];
    isPublished?: boolean;
    successMessage?: string;
}

/** Update an existing form definition. */
export function useUpdateFormDefinition() {
    const mutation = useMutation(api.domain.notifications.updateFormDefinition);
    const update = async (input: UpdateFormDefinitionInput): Promise<{ success: boolean }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation(input as any);
        return { success: result.success };
    };
    return { updateFormDefinition: update };
}

/** Delete a form definition. */
export function useDeleteFormDefinition() {
    const mutation = useMutation(api.domain.notifications.deleteFormDefinition);
    const remove = async (id: string): Promise<{ success: boolean }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation({ id } as any);
        return { success: result.success };
    };
    return { deleteFormDefinition: remove };
}

// =============================================================================
// SEND TEST EMAIL HOOK
// =============================================================================

export interface SendTestEmailInput {
    templateId: string;
    recipientEmail: string;
    tenantId?: string;
}

/** Send a test email using a template. */
export function useSendTestEmail() {
    const mutation = useMutation(api.domain.notifications.sendTestEmail);
    const sendTestEmail = async (input: SendTestEmailInput): Promise<{ success: boolean; message: string }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation(input as any);
        return { success: result.success, message: result.message };
    };
    return { sendTestEmail };
}

// =============================================================================
// SEND EMAIL HOOK (manual dispatch)
// =============================================================================

export interface SendEmailInput {
    tenantId: string;
    templateCategory: string;
    templateName?: string;
    recipientEmail: string;
    recipientName?: string;
    userId?: string;
    variables: Record<string, unknown>;
}

/** Send an email using a template. */
export function useSendEmail() {
    const mutation = useMutation(api.domain.notifications.sendEmail);
    const sendEmail = async (input: SendEmailInput): Promise<{ success: boolean; message: string }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
        const result = await mutation(input as any);
        return { success: result.success, message: result.message };
    };
    return { sendEmail };
}
