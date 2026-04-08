import { describe, it, expect } from "vitest";
import {
    DEFAULT_RETENTION,
    mergeRetentionConfig,
    daysToMs,
    isOlderThan,
} from "../retentionDefaults";

describe("retentionDefaults", () => {
    // =========================================================================
    // mergeRetentionConfig
    // =========================================================================

    describe("mergeRetentionConfig", () => {
        it("returns defaults when input is null", () => {
            expect(mergeRetentionConfig(null)).toEqual(DEFAULT_RETENTION);
        });

        it("returns defaults when input is undefined", () => {
            expect(mergeRetentionConfig(undefined)).toEqual(DEFAULT_RETENTION);
        });

        it("returns defaults when input is not an object", () => {
            expect(mergeRetentionConfig("string")).toEqual(DEFAULT_RETENTION);
            expect(mergeRetentionConfig(42)).toEqual(DEFAULT_RETENTION);
            expect(mergeRetentionConfig(true)).toEqual(DEFAULT_RETENTION);
        });

        it("returns defaults when input is empty object", () => {
            expect(mergeRetentionConfig({})).toEqual(DEFAULT_RETENTION);
        });

        it("merges partial overrides correctly", () => {
            const result = mergeRetentionConfig({
                notificationDays: 30,
                auditLogDays: 1095,
            });

            expect(result.notificationDays).toBe(30);
            expect(result.auditLogDays).toBe(1095);
            // Other fields remain at defaults
            expect(result.softDeletedDays).toBe(DEFAULT_RETENTION.softDeletedDays);
            expect(result.archivedDays).toBe(DEFAULT_RETENTION.archivedDays);
            expect(result.messagingDays).toBe(DEFAULT_RETENTION.messagingDays);
            expect(result.enabled).toBe(DEFAULT_RETENTION.enabled);
        });

        it("rejects negative numbers, falls back to default", () => {
            const result = mergeRetentionConfig({
                notificationDays: -10,
                auditLogDays: -1,
            });

            expect(result.notificationDays).toBe(DEFAULT_RETENTION.notificationDays);
            expect(result.auditLogDays).toBe(DEFAULT_RETENTION.auditLogDays);
        });

        it("rejects zero, falls back to default", () => {
            const result = mergeRetentionConfig({ softDeletedDays: 0 });
            expect(result.softDeletedDays).toBe(DEFAULT_RETENTION.softDeletedDays);
        });

        it("rejects NaN and Infinity, falls back to default", () => {
            const result = mergeRetentionConfig({
                softDeletedDays: NaN,
                archivedDays: Infinity,
                auditLogDays: -Infinity,
            });

            expect(result.softDeletedDays).toBe(DEFAULT_RETENTION.softDeletedDays);
            expect(result.archivedDays).toBe(DEFAULT_RETENTION.archivedDays);
            expect(result.auditLogDays).toBe(DEFAULT_RETENTION.auditLogDays);
        });

        it("rejects non-numeric values for day fields", () => {
            const result = mergeRetentionConfig({
                notificationDays: "thirty",
                auditLogDays: true,
            });

            expect(result.notificationDays).toBe(DEFAULT_RETENTION.notificationDays);
            expect(result.auditLogDays).toBe(DEFAULT_RETENTION.auditLogDays);
        });

        it("handles enabled flag as boolean", () => {
            expect(mergeRetentionConfig({ enabled: false }).enabled).toBe(false);
            expect(mergeRetentionConfig({ enabled: true }).enabled).toBe(true);
        });

        it("falls back to default when enabled is not a boolean", () => {
            expect(mergeRetentionConfig({ enabled: "yes" }).enabled).toBe(DEFAULT_RETENTION.enabled);
            expect(mergeRetentionConfig({ enabled: 1 }).enabled).toBe(DEFAULT_RETENTION.enabled);
        });

        it("accepts valid positive integers", () => {
            const result = mergeRetentionConfig({
                softDeletedDays: 7,
                archivedDays: 180,
                auditLogDays: 365,
                notificationDays: 14,
                messagingDays: 60,
                enabled: false,
            });

            expect(result).toEqual({
                softDeletedDays: 7,
                archivedDays: 180,
                auditLogDays: 365,
                notificationDays: 14,
                messagingDays: 60,
                enabled: false,
            });
        });
    });

    // =========================================================================
    // daysToMs
    // =========================================================================

    describe("daysToMs", () => {
        it("converts 1 day to 86400000 ms", () => {
            expect(daysToMs(1)).toBe(86_400_000);
        });

        it("converts 90 days correctly", () => {
            expect(daysToMs(90)).toBe(90 * 24 * 60 * 60 * 1000);
        });

        it("converts 365 days correctly", () => {
            expect(daysToMs(365)).toBe(365 * 24 * 60 * 60 * 1000);
        });

        it("converts fractional days", () => {
            expect(daysToMs(0.5)).toBe(12 * 60 * 60 * 1000);
        });
    });

    // =========================================================================
    // isOlderThan
    // =========================================================================

    describe("isOlderThan", () => {
        const now = 1_000_000_000;

        it("returns true when timestamp is older than threshold", () => {
            // timestamp is 200ms old, threshold is 100ms
            expect(isOlderThan(now - 200, 100, now)).toBe(true);
        });

        it("returns false when timestamp is newer than threshold", () => {
            // timestamp is 50ms old, threshold is 100ms
            expect(isOlderThan(now - 50, 100, now)).toBe(false);
        });

        it("returns false when timestamp is exactly at threshold", () => {
            // timestamp is exactly 100ms old, threshold is 100ms (not strictly older)
            expect(isOlderThan(now - 100, 100, now)).toBe(false);
        });

        it("returns true for very old timestamps", () => {
            expect(isOlderThan(0, 1000, now)).toBe(true);
        });

        it("returns false for future timestamps", () => {
            expect(isOlderThan(now + 100, 50, now)).toBe(false);
        });
    });

    // =========================================================================
    // DEFAULT_RETENTION values are sensible
    // =========================================================================

    describe("DEFAULT_RETENTION", () => {
        it("has positive values for all day fields", () => {
            expect(DEFAULT_RETENTION.softDeletedDays).toBeGreaterThan(0);
            expect(DEFAULT_RETENTION.archivedDays).toBeGreaterThan(0);
            expect(DEFAULT_RETENTION.auditLogDays).toBeGreaterThan(0);
            expect(DEFAULT_RETENTION.notificationDays).toBeGreaterThan(0);
            expect(DEFAULT_RETENTION.messagingDays).toBeGreaterThan(0);
        });

        it("is enabled by default", () => {
            expect(DEFAULT_RETENTION.enabled).toBe(true);
        });

        it("keeps audit logs longer than notifications", () => {
            expect(DEFAULT_RETENTION.auditLogDays).toBeGreaterThan(DEFAULT_RETENTION.notificationDays);
        });
    });
});
