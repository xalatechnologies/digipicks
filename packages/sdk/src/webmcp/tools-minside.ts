/**
 * WebMCP Tool Factories — Min Side (My Pages)
 *
 * User-facing tools for viewing bookings, billing, profile, and messaging.
 * Only operations with a real backend (no stubs) are exposed.
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

export function createGetMyBillingSummaryTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getMyBillingSummary',
    description:
      'Get your billing summary including total spent, pending amount, and billing period.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Billing period to query (optional)',
        },
      },
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');

        const args: Record<string, unknown> = { userId: ctx.userId };
        if (params.period) args.period = params.period;

        const summary = await ctx.convex.query(
          api.domain.billing.getSummary as unknown,
          args,
        );

        return textResult(summary);
      } catch (e) {
        return errorResult(`Failed to fetch billing summary: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetMyInvoicesTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getMyInvoices',
    description:
      'List your invoices. Filter by status (paid, unpaid, overdue) for specific invoices.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by invoice status (e.g. paid, unpaid, overdue)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)',
        },
      },
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');

        const args: Record<string, unknown> = {
          userId: ctx.userId,
          limit: (params.limit as number) ?? 20,
        };
        if (params.status) args.status = params.status;

        const invoices = await ctx.convex.query(
          api.domain.billing.listInvoices as unknown,
          args,
        );

        return textResult(invoices);
      } catch (e) {
        return errorResult(`Failed to fetch invoices: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetMyProfileTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getMyProfile',
    description:
      'Get your user profile including name, email, phone, and account details.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async execute() {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');

        const user = await ctx.convex.query(
          api.users.index.me as unknown,
          { authUserId: ctx.userId },
        ) as Record<string, unknown> | null;

        if (!user) return errorResult('Profile not found');

        // Return a safe subset (no internal IDs or sensitive data)
        return textResult({
          id: user._id ?? user.id,
          name: user.name,
          displayName: user.displayName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
          organizationId: user.organizationId,
          tenant: user.tenant,
        });
      } catch (e) {
        return errorResult(`Failed to fetch profile: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetMyConversationsTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getMyConversations',
    description:
      'List your message conversations, including unread counts. Use to find conversations to read or reply to.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by conversation status (e.g. open, resolved)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)',
        },
      },
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');

        const args: Record<string, unknown> = {
          userId: ctx.userId,
          limit: (params.limit as number) ?? 20,
        };
        if (params.status) args.status = params.status;

        const conversations = await ctx.convex.query(
          api.domain.messaging.listConversations as unknown,
          args,
        );

        return textResult(conversations);
      } catch (e) {
        return errorResult(`Failed to fetch conversations: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetConversationMessagesTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getConversationMessages',
    description:
      'Read messages in a specific conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID',
        },
        limit: {
          type: 'number',
          description: 'Max messages to return (default 50)',
        },
      },
      required: ['conversationId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');
        if (!params.conversationId) return errorResult('conversationId is required');

        const messages = await ctx.convex.query(
          api.domain.messaging.listMessages as unknown,
          {
            conversationId: params.conversationId as string,
            limit: (params.limit as number) ?? 50,
          },
        );

        return textResult(messages);
      } catch (e) {
        return errorResult(`Failed to fetch messages: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

// ─── Mutation tools ──────────────────────────────────────────────────────────

export function createUpdateMyProfileTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'updateMyProfile',
    description:
      'Update your profile information (name, display name). You will be asked to confirm before changes are saved.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Your full name',
        },
        displayName: {
          type: 'string',
          description: 'Your display name (shown publicly)',
        },
      },
    },
    async execute(params) {
      try {
        if (!ctx.userId) return errorResult('You must be logged in.');

        const args: Record<string, unknown> = { id: ctx.userId };
        if (params.name) args.name = params.name;
        if (params.displayName) args.displayName = params.displayName;

        if (Object.keys(args).length === 1) {
          return errorResult('Provide at least one field to update (name or displayName)');
        }

        await ctx.convex.mutation(
          api.users.mutations.update as unknown,
          args,
        );

        return textResult({ success: true, message: 'Profile updated' });
      } catch (e) {
        return errorResult(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createUserSendMessageTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'sendMessage',
    description:
      'Send a message in a conversation.',
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
