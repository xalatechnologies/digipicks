/**
 * Error Tracking — Pure Logic Tests
 *
 * Tests withErrorTracking, sanitizeArgs, parseDsn, and buildSentryEnvelope.
 * No Convex runtime required — pure functions, plain vitest.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    withErrorTracking,
    sanitizeArgs,
    parseDsn,
    buildSentryEnvelope,
    reportError,
} from "../errorTracking";

// =============================================================================
// withErrorTracking
// =============================================================================

describe("withErrorTracking", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("calls the original handler and returns its result on success", async () => {
        const handler = vi.fn().mockResolvedValue({ id: "123" });
        const wrapped = withErrorTracking(handler, "test.success");

        const result = await wrapped({}, { tenantId: "t1" });

        expect(result).toEqual({ id: "123" });
        expect(handler).toHaveBeenCalledOnce();
    });

    it("passes ctx and args through to the original handler", async () => {
        const handler = vi.fn().mockResolvedValue("ok");
        const wrapped = withErrorTracking(handler, "test.passthrough");
        const ctx = { db: "mockDb" };
        const args = { tenantId: "t1", name: "Test" };

        await wrapped(ctx, args);

        expect(handler).toHaveBeenCalledWith(ctx, args);
    });

    it("re-throws the original error after reporting", async () => {
        const originalError = new Error("Something broke");
        const handler = vi.fn().mockRejectedValue(originalError);
        const wrapped = withErrorTracking(handler, "test.rethrow");

        // Suppress console.error from reportError
        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(wrapped({}, {})).rejects.toThrow(originalError);
    });

    it("preserves the error type (not wrapping it)", async () => {
        const originalError = new TypeError("invalid type");
        const handler = vi.fn().mockRejectedValue(originalError);
        const wrapped = withErrorTracking(handler, "test.errorType");

        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(wrapped({}, {})).rejects.toBeInstanceOf(TypeError);
    });

    it("handles non-Error thrown values", async () => {
        const handler = vi.fn().mockRejectedValue("string error");
        const wrapped = withErrorTracking(handler, "test.stringError");

        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(wrapped({}, {})).rejects.toBe("string error");
    });
});

// =============================================================================
// sanitizeArgs
// =============================================================================

describe("sanitizeArgs", () => {
    it("returns undefined for undefined input", () => {
        expect(sanitizeArgs(undefined)).toBeUndefined();
    });

    it("returns a copy without modifying the original", () => {
        const original = { tenantId: "t1", name: "Test" };
        const result = sanitizeArgs(original);
        expect(result).toEqual(original);
        expect(result).not.toBe(original);
    });

    it("strips password field", () => {
        const result = sanitizeArgs({ userId: "u1", password: "hunter2" });
        expect(result).toEqual({ userId: "u1", password: "[REDACTED]" });
    });

    it("strips token field", () => {
        const result = sanitizeArgs({ token: "abc123", action: "login" });
        expect(result).toEqual({ token: "[REDACTED]", action: "login" });
    });

    it("strips secret field", () => {
        const result = sanitizeArgs({ secret: "s3cr3t", data: "ok" });
        expect(result).toEqual({ secret: "[REDACTED]", data: "ok" });
    });

    it("strips apiKey field", () => {
        const result = sanitizeArgs({ apiKey: "key-123" });
        expect(result).toEqual({ apiKey: "[REDACTED]" });
    });

    it("strips creditCard field", () => {
        const result = sanitizeArgs({ creditCard: "4111111111111111" });
        expect(result).toEqual({ creditCard: "[REDACTED]" });
    });

    it("strips multiple sensitive fields at once", () => {
        const result = sanitizeArgs({
            password: "pw",
            token: "tk",
            apiKey: "ak",
            tenantId: "t1",
        });
        expect(result).toEqual({
            password: "[REDACTED]",
            token: "[REDACTED]",
            apiKey: "[REDACTED]",
            tenantId: "t1",
        });
    });

    it("leaves non-sensitive fields untouched", () => {
        const args = { tenantId: "t1", userId: "u1", amount: 100 };
        expect(sanitizeArgs(args)).toEqual(args);
    });
});

// =============================================================================
// parseDsn
// =============================================================================

describe("parseDsn", () => {
    it("extracts key, host, and projectId from a standard DSN", () => {
        const dsn = "https://abc123@o1234.ingest.sentry.io/5678";
        const result = parseDsn(dsn);
        expect(result).toEqual({
            key: "abc123",
            host: "o1234.ingest.sentry.io",
            projectId: "5678",
        });
    });

    it("handles DSN with longer project IDs", () => {
        const dsn = "https://keyvalue@sentry.example.com/1234567890";
        const result = parseDsn(dsn);
        expect(result.key).toBe("keyvalue");
        expect(result.host).toBe("sentry.example.com");
        expect(result.projectId).toBe("1234567890");
    });
});

// =============================================================================
// buildSentryEnvelope
// =============================================================================

describe("buildSentryEnvelope", () => {
    it("produces a three-line envelope", () => {
        const error = new Error("Test error");
        error.name = "Error";
        const envelope = buildSentryEnvelope(
            "https://key@o1.ingest.sentry.io/42",
            error,
            "billing.createPayment",
            "2026-04-02T12:00:00Z",
        );

        const lines = envelope.split("\n");
        expect(lines).toHaveLength(3);

        // Header
        const header = JSON.parse(lines[0]);
        expect(header.dsn).toBe("https://key@o1.ingest.sentry.io/42");
        expect(header.event_id).toMatch(/^[a-f0-9]{32}$/);

        // Item header
        const itemHeader = JSON.parse(lines[1]);
        expect(itemHeader.type).toBe("event");

        // Event payload
        const event = JSON.parse(lines[2]);
        expect(event.platform).toBe("javascript");
        expect(event.level).toBe("error");
        expect(event.server_name).toBe("convex");
        expect(event.transaction).toBe("billing.createPayment");
        expect(event.exception.values[0].type).toBe("Error");
        expect(event.exception.values[0].value).toBe("Test error");
        expect(event.tags.runtime).toBe("convex");
        expect(event.tags.function).toBe("billing.createPayment");
    });
});

// =============================================================================
// reportError (console logging)
// =============================================================================

describe("reportError", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("logs structured JSON to console.error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        await reportError(new Error("db timeout"), "billing.getSummary", {
            userId: "u1",
        });

        expect(spy).toHaveBeenCalledOnce();
        const logged = JSON.parse(spy.mock.calls[0][0] as string);
        expect(logged.level).toBe("error");
        expect(logged.function).toBe("billing.getSummary");
        expect(logged.message).toBe("db timeout");
        expect(logged.args).toEqual({ userId: "u1" });
        expect(logged.timestamp).toBeDefined();
    });

    it("sanitizes sensitive args in the log", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        await reportError(new Error("fail"), "auth.login", {
            email: "a@b.com",
            password: "secret",
        });

        const logged = JSON.parse(spy.mock.calls[0][0] as string);
        expect(logged.args.password).toBe("[REDACTED]");
        expect(logged.args.email).toBe("a@b.com");
    });

    it("handles non-Error values gracefully", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        await reportError("raw string error", "test.nonError");

        const logged = JSON.parse(spy.mock.calls[0][0] as string);
        expect(logged.message).toBe("raw string error");
    });
});
