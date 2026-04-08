/**
 * WebMCP — expose Digilist tools to AI agents
 *
 * Three app-specific hooks:
 * - useWebMCPTools()            — public web (search, book, favorites)
 * - useBackofficeWebMCPTools()  — admin (bookings, listings, users, audit)
 * - useMinsideWebMCPTools()     — user (my bookings, billing, profile, messages)
 *
 * @see https://developer.chrome.com/blog/webmcp-epp
 * @see https://github.com/webmachinelearning/webmcp
 */

// ─── Hooks ───────────────────────────────────────────────────────────────────

export { useWebMCPTools } from './use-webmcp-tools';
export type { UseWebMCPToolsOptions } from './use-webmcp-tools';

export { useBackofficeWebMCPTools } from './use-backoffice-webmcp-tools';
export type { UseBackofficeWebMCPToolsOptions } from './use-backoffice-webmcp-tools';

export { useMinsideWebMCPTools } from './use-minside-webmcp-tools';
export type { UseMinsideWebMCPToolsOptions } from './use-minside-webmcp-tools';

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  ModelContextTool,
  MCPContent,
  MCPContentPart,
  ModelContext,
  AgentInterface,
  WebMCPContext,
  JSONSchema,
  JSONSchemaProperty,
} from './types';

// ─── Tool factories (advanced use / testing) ─────────────────────────────────

// Web (public)
export {
  createSearchListingsTool,
  createGetListingDetailsTool,
  createToggleFavoriteTool,
} from './tools';

// Backoffice (admin)
export {
  createListAllListingsTool,
  createListUsersTool,
  createGetAuditLogTool,
  createPublishListingTool,
  createUnpublishListingTool,
  createSuspendUserTool,
  createReactivateUserTool,
  createAdminSendMessageTool,
  createResolveConversationTool,
} from './tools-backoffice';

// Minside (user)
export {
  createGetMyBillingSummaryTool,
  createGetMyInvoicesTool,
  createGetMyProfileTool,
  createGetMyConversationsTool,
  createGetConversationMessagesTool,
  createUpdateMyProfileTool,
  createUserSendMessageTool,
} from './tools-minside';
