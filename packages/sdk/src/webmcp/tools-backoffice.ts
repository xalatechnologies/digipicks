/**
 * WebMCP Tool Factories — Backoffice (Admin)
 *
 * Admin-facing tools for managing bookings, listings, users, audit trail,
 * and messaging. Only registered when the user is authenticated with an
 * admin or case_handler role.
 */

import { api } from '../convex-api';
import type { WebMCPContext, ModelContextTool, MCPContent } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function textResult(data: unknown): MCPContent {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): MCPContent {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
  };
}

// ─── Read-only tools ─────────────────────────────────────────────────────────

export function createListAllListingsTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'listAllListings',
    description:
      'List all venues/listings including drafts and archived. Use status filter to find listings that need attention.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: active, draft, archived',
          enum: ['active', 'draft', 'archived'],
        },
        category: {
          type: 'string',
          description: 'Filter by category key (e.g. LOKALER, NAERING)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 50)',
        },
      },
    },
    async execute(params) {
      try {
        const args: Record<string, unknown> = {
          tenantId: ctx.tenantId,
          limit: (params.limit as number) ?? 50,
        };
        if (params.status) args.status = params.status;
        if (params.category) args.categoryKey = params.category;

        const listings = await ctx.convex.query(
          api.domain.resources.listAll as unknown,
          args,
        ) as Array<Record<string, unknown>>;

        const result = (listings ?? []).map((r) => ({
          id: r._id ?? r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          category: r.categoryKey,
          capacity: r.capacity,
          price: r.price,
          averageRating: (r.reviewStats as { averageRating?: number } | undefined)?.averageRating,
          reviewCount: (r.reviewStats as { total?: number } | undefined)?.total,
        }));

        return textResult({ count: result.length, listings: result });
      } catch (e) {
        return errorResult(`Failed to list listings: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createListUsersTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'listUsers',
    description:
      'List all users with optional status and role filters. Use to find specific users or check who is active/suspended.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: active, suspended, invited, deleted',
          enum: ['active', 'suspended', 'invited', 'deleted'],
        },
        role: {
          type: 'string',
          description: 'Filter by role (e.g. admin, case_handler, user)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 50)',
        },
      },
    },
    async execute(params) {
      try {
        const args: Record<string, unknown> = {
          tenantId: ctx.tenantId,
          limit: (params.limit as number) ?? 50,
        };
        if (params.status) args.status = params.status;
        if (params.role) args.role = params.role;

        const users = await ctx.convex.query(
          api.users.index.list as unknown,
          args,
        ) as Array<Record<string, unknown>>;

        const result = (users ?? []).map((u) => ({
          id: u._id ?? u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u._creationTime,
        }));

        return textResult({ count: result.length, users: result });
      } catch (e) {
        return errorResult(`Failed to list users: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetAuditLogTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getAuditLog',
    description:
      'View the audit trail for the tenant. Filter by entity type (booking, resource, user) to see specific activity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'Filter by entity type: booking, resource, user, review, organization',
        },
        limit: {
          type: 'number',
          description: 'Max entries to return (default 30)',
        },
      },
    },
    async execute(params) {
      try {
        const args: Record<string, unknown> = {
          tenantId: ctx.tenantId,
          limit: (params.limit as number) ?? 30,
        };
        if (params.entityType) args.entityType = params.entityType;

        const entries = await ctx.convex.query(
          api.domain.audit.listForTenant as unknown,
          args,
        );

        return textResult(entries);
      } catch (e) {
        return errorResult(`Failed to fetch audit log: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

// ─── Mutation tools ──────────────────────────────────────────────────────────

export function createPublishListingTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'publishListing',
    description:
      'Publish a draft listing, making it visible on the public booking platform.',
    inputSchema: {
      type: 'object',
      properties: {
        listingId: {
          type: 'string',
          description: 'ID of the listing to publish',
        },
      },
      required: ['listingId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.listingId) return errorResult('listingId is required');

        await ctx.convex.mutation(
          api.domain.resources.publish as unknown,
          { id: params.listingId as string, publishedBy: ctx.userId },
        );

        return textResult({ success: true, message: 'Listing published' });
      } catch (e) {
        return errorResult(`Publish failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createUnpublishListingTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'unpublishListing',
    description:
      'Unpublish a listing, removing it from the public booking platform. Existing bookings are not affected.',
    inputSchema: {
      type: 'object',
      properties: {
        listingId: {
          type: 'string',
          description: 'ID of the listing to unpublish',
        },
      },
      required: ['listingId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.listingId) return errorResult('listingId is required');

        await ctx.convex.mutation(
          api.domain.resources.unpublish as unknown,
          { id: params.listingId as string, unpublishedBy: ctx.userId },
        );

        return textResult({ success: true, message: 'Listing unpublished' });
      } catch (e) {
        return errorResult(`Unpublish failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createSuspendUserTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'suspendUser',
    description:
      'Suspend (deactivate) a user account. The user will lose access until reactivated.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID of the user to suspend',
        },
        reason: {
          type: 'string',
          description: 'Reason for suspension (optional)',
        },
      },
      required: ['userId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.userId) return errorResult('userId is required');

        await ctx.convex.mutation(
          api.users.mutations.suspend as unknown,
          {
            id: params.userId as string,
            reason: (params.reason as string) || undefined,
          },
        );

        return textResult({ success: true, message: 'User suspended' });
      } catch (e) {
        return errorResult(`Suspend failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createReactivateUserTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'reactivateUser',
    description:
      'Reactivate a suspended user account, restoring their access.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID of the user to reactivate',
        },
      },
      required: ['userId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.userId) return errorResult('userId is required');

        await ctx.convex.mutation(
          api.users.mutations.reactivate as unknown,
          { id: params.userId as string },
        );

        return textResult({ success: true, message: 'User reactivated' });
      } catch (e) {
        return errorResult(`Reactivation failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createAdminSendMessageTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'sendMessage',
    description:
      'Send a message in a conversation as an admin/case handler.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID to send the message in',
        },
        content: {
          type: 'string',
          description: 'Message content',
        },
      },
      required: ['conversationId', 'content'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.conversationId || !params.content) {
          return errorResult('conversationId and content are required');
        }

        await ctx.convex.mutation(
          api.domain.messaging.sendMessage as unknown,
          {
            tenantId: ctx.tenantId,
            conversationId: params.conversationId as string,
            senderId: ctx.userId,
            senderType: 'admin',
            content: params.content as string,
          },
        );

        return textResult({ success: true, message: 'Message sent' });
      } catch (e) {
        return errorResult(`Send failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createResolveConversationTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'resolveConversation',
    description:
      'Mark a conversation as resolved. Use when a support case has been fully addressed.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID to resolve',
        },
      },
      required: ['conversationId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.conversationId) return errorResult('conversationId is required');

        await ctx.convex.mutation(
          api.domain.messaging.resolveConversation as unknown,
          {
            id: params.conversationId as string,
            resolvedBy: ctx.userId,
          },
        );

        return textResult({ success: true, message: 'Conversation resolved' });
      } catch (e) {
        return errorResult(`Resolve failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}
