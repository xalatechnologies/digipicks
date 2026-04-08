/**
 * WebMCP Type Declarations
 *
 * Types for the W3C WebMCP standard (Chrome 146+).
 * Allows websites to expose structured tools to AI agents via
 * navigator.modelContext.registerTool() or provideContext().
 *
 * @see https://developer.chrome.com/blog/webmcp-epp
 * @see https://github.com/webmachinelearning/webmcp
 */

// ─── JSON Schema subset for tool input definitions ───────────────────────────

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

// ─── MCP content returned from tool execution ────────────────────────────────

export interface MCPContentPart {
  type: 'text';
  text: string;
}

export interface MCPContent {
  content: MCPContentPart[];
}

// ─── Agent interface passed to execute() by the browser ──────────────────────

export interface AgentInterface {
  /**
   * Request user interaction during tool execution.
   * The browser presents a UI allowing the user to confirm or provide input.
   * Can be called multiple times per tool execution.
   */
  requestUserInteraction: <T>(callback: () => Promise<T>) => Promise<T>;
}

// ─── Tool definition registered with the browser ─────────────────────────────

export interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  /**
   * Execute the tool. The browser passes an optional AgentInterface as the
   * second argument, which provides requestUserInteraction() for user prompts.
   */
  execute: (
    params: Record<string, unknown>,
    agent?: AgentInterface,
  ) => Promise<MCPContent> | MCPContent;
}

// ─── Browser API surface ─────────────────────────────────────────────────────

export interface ModelContext {
  /**
   * Register a single tool without clearing existing tools.
   */
  registerTool(tool: ModelContextTool): void;

  /**
   * Remove a previously registered tool by name.
   */
  unregisterTool(name: string): void;

  /**
   * Replace all registered tools with a new set.
   * Preferred for SPAs that change tool sets based on UI state.
   * Falls back to registerTool loop on older Chrome builds.
   */
  provideContext?(context: { tools: ModelContextTool[] }): void;
}

// ─── Context passed to tool factory functions ────────────────────────────────

export interface WebMCPContext {
  /** Raw Convex client for direct queries/mutations */
  convex: {
    query: (fn: unknown, args: Record<string, unknown>) => Promise<unknown>;
    mutation: (fn: unknown, args: Record<string, unknown>) => Promise<unknown>;
  };
  tenantId: string;
  userId?: string;
}

// ─── Global augmentation ─────────────────────────────────────────────────────

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}
