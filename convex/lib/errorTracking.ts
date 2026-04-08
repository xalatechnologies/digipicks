/**
 * Server-side error tracking for Convex functions.
 *
 * Reports errors to Sentry via HTTP Ingest API (no Node.js SDK needed).
 * Falls back to structured console.error when SENTRY_DSN is not set.
 *
 * IMPORTANT: Sentry HTTP reporting (fetch + process.env) only works inside
 * Convex actions. In queries/mutations the wrapper still provides structured
 * console logging, which is visible in the Convex dashboard.
 *
 * Usage:
 *   import { withErrorTracking } from "../lib/errorTracking";
 *   handler: withErrorTracking(async (ctx, args) => { ... }, "billing.createPayment"),
 */

// =============================================================================
// TYPES
// =============================================================================

/** Minimal context — works with QueryCtx, MutationCtx, and ActionCtx. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCtx = Record<string, any>;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Wrap a Convex function handler with error tracking.
 * Re-throws the error after reporting — does not swallow.
 */
export function withErrorTracking<Args extends Record<string, unknown>, Result>(
    handler: (ctx: AnyCtx, args: Args) => Promise<Result>,
    functionName: string,
): (ctx: AnyCtx, args: Args) => Promise<Result> {
    return async (ctx, args) => {
        try {
            return await handler(ctx, args);
        } catch (error) {
            await reportError(error, functionName, args);
            throw error;
        }
    };
}

// =============================================================================
// INTERNAL — REPORTING
// =============================================================================

/**
 * Report an error with structured context.
 * Uses Sentry HTTP API if SENTRY_DSN env is configured (actions only).
 * Always logs to console.error for Convex dashboard visibility.
 */
export async function reportError(
    error: unknown,
    functionName: string,
    args?: Record<string, unknown>,
): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    const timestamp = new Date().toISOString();

    // Structured log — always available in Convex dashboard
    console.error(JSON.stringify({
        level: "error",
        timestamp,
        function: functionName,
        message: err.message,
        stack: err.stack?.split("\n").slice(0, 5).join("\n"),
        args: sanitizeArgs(args),
    }));

    // Sentry HTTP Ingest — only works in actions (process.env + fetch)
    try {
        const dsn = typeof process !== "undefined" && process.env
            ? process.env.SENTRY_DSN
            : undefined;
        if (dsn) {
            await sendToSentry(dsn, err, functionName, timestamp);
        }
    } catch {
        // Silently ignore: either we're in a query/mutation (no process.env),
        // or Sentry itself failed. Never break the caller.
    }
}

// =============================================================================
// INTERNAL — SANITIZATION
// =============================================================================

/** Sensitive field names that must never appear in logs or Sentry payloads. */
const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
    "ssn",
    "accessToken",
    "refreshToken",
]);

/** Strip sensitive fields from args before logging. */
export function sanitizeArgs(
    args?: Record<string, unknown>,
): Record<string, unknown> | undefined {
    if (!args) return undefined;
    const sanitized = { ...args };
    for (const key of Object.keys(sanitized)) {
        if (SENSITIVE_KEYS.has(key)) {
            sanitized[key] = "[REDACTED]";
        }
    }
    return sanitized;
}

// =============================================================================
// INTERNAL — SENTRY HTTP
// =============================================================================

/**
 * Parse a Sentry DSN into its components.
 * DSN format: https://{key}@{host}/{projectId}
 */
export function parseDsn(dsn: string): { key: string; host: string; projectId: string } {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace("/", "");
    const host = url.hostname;
    return { key, host, projectId };
}

/**
 * Build a Sentry envelope payload for an error event.
 * @see https://develop.sentry.dev/sdk/envelopes/
 */
export function buildSentryEnvelope(
    dsn: string,
    error: Error,
    functionName: string,
    timestamp: string,
): string {
    const { key: _key, host: _host, projectId: _projectId } = parseDsn(dsn);
    const eventId = generateEventId();

    return [
        JSON.stringify({ event_id: eventId, dsn, sent_at: timestamp }),
        JSON.stringify({ type: "event" }),
        JSON.stringify({
            event_id: eventId,
            timestamp: Math.floor(Date.now() / 1000),
            platform: "javascript",
            level: "error",
            server_name: "convex",
            transaction: functionName,
            exception: {
                values: [{
                    type: error.name,
                    value: error.message,
                    stacktrace: error.stack
                        ? {
                            frames: error.stack.split("\n").slice(1, 10).map((line) => ({
                                filename: line.trim(),
                            })),
                        }
                        : undefined,
                }],
            },
            tags: {
                runtime: "convex",
                function: functionName,
            },
        }),
    ].join("\n");
}

/** Send error to Sentry via the Store endpoint (envelope format). */
async function sendToSentry(
    dsn: string,
    error: Error,
    functionName: string,
    timestamp: string,
): Promise<void> {
    const { key, host, projectId } = parseDsn(dsn);
    const envelope = buildSentryEnvelope(dsn, error, functionName, timestamp);

    await fetch(`https://${host}/api/${projectId}/envelope/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-sentry-envelope",
            "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}`,
        },
        body: envelope,
    });
}

/** Generate a 32-char hex event ID (Sentry format). */
function generateEventId(): string {
    // crypto.randomUUID() is available in Convex V8 isolates
    return crypto.randomUUID().replace(/-/g, "");
}
