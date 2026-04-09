/**
 * Pick Collaboration — Convex Tests
 *
 * Covers pickCollaborator functions:
 *   - addPickCollaborator (validation, duplicate guard, max guard)
 *   - removePickCollaborator (success, not-found)
 *   - listPickCollaborators
 *   - setPickCollaborators (atomic replace, split validation, max guard)
 *   - validatePickSplits
 *   - listPicksByCollaborator
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/collaboration.test.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-collab-001";
const CREATOR_A = "creator-a";
const CREATOR_B = "creator-b";
const CREATOR_C = "creator-c";

async function createPick(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{ tenantId: string; creatorId: string }> = {},
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR_A,
        event: "Lakers vs Celtics",
        sport: "NBA",
        pickType: "spread",
        selection: "Lakers -3.5",
        oddsAmerican: "-110",
        oddsDecimal: 1.91,
        units: 1,
        confidence: "medium",
    });
}

// ---------------------------------------------------------------------------
// addPickCollaborator
// ---------------------------------------------------------------------------

describe("picks/collaborators — addPickCollaborator", () => {
    it("adds a collaborator to a pick", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        const result = await t.mutation(api.functions.addPickCollaborator, {
            tenantId: TENANT,
            pickId: pick.id,
            creatorId: CREATOR_B,
            role: "contributor",
            splitPercent: 40,
        });

        expect(result.id).toBeDefined();

        const collabs = await t.query(api.functions.listPickCollaborators, { pickId: pick.id });
        expect(collabs).toHaveLength(1);
        expect(collabs[0].creatorId).toBe(CREATOR_B);
        expect(collabs[0].role).toBe("contributor");
        expect(collabs[0].splitPercent).toBe(40);
    });

    it("rejects invalid role", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await expect(
            t.mutation(api.functions.addPickCollaborator, {
                tenantId: TENANT,
                pickId: pick.id,
                creatorId: CREATOR_B,
                role: "owner",
                splitPercent: 50,
            })
        ).rejects.toThrow("Invalid collaborator role");
    });

    it("rejects invalid split percent", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await expect(
            t.mutation(api.functions.addPickCollaborator, {
                tenantId: TENANT,
                pickId: pick.id,
                creatorId: CREATOR_B,
                role: "contributor",
                splitPercent: 150,
            })
        ).rejects.toThrow("Split percent must be between 0 and 100");
    });

    it("rejects duplicate collaborator", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await t.mutation(api.functions.addPickCollaborator, {
            tenantId: TENANT,
            pickId: pick.id,
            creatorId: CREATOR_B,
            role: "contributor",
            splitPercent: 30,
        });

        await expect(
            t.mutation(api.functions.addPickCollaborator, {
                tenantId: TENANT,
                pickId: pick.id,
                creatorId: CREATOR_B,
                role: "lead",
                splitPercent: 40,
            })
        ).rejects.toThrow("already a collaborator");
    });

    it("enforces max 5 collaborators", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        for (let i = 0; i < 5; i++) {
            await t.mutation(api.functions.addPickCollaborator, {
                tenantId: TENANT,
                pickId: pick.id,
                creatorId: `creator-${i}`,
                role: "contributor",
                splitPercent: 20,
            });
        }

        await expect(
            t.mutation(api.functions.addPickCollaborator, {
                tenantId: TENANT,
                pickId: pick.id,
                creatorId: "creator-6th",
                role: "contributor",
                splitPercent: 10,
            })
        ).rejects.toThrow("Maximum 5 collaborators");
    });
});

// ---------------------------------------------------------------------------
// removePickCollaborator
// ---------------------------------------------------------------------------

describe("picks/collaborators — removePickCollaborator", () => {
    it("removes a collaborator", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await t.mutation(api.functions.addPickCollaborator, {
            tenantId: TENANT,
            pickId: pick.id,
            creatorId: CREATOR_B,
            role: "contributor",
            splitPercent: 30,
        });

        const result = await t.mutation(api.functions.removePickCollaborator, {
            pickId: pick.id,
            creatorId: CREATOR_B,
        });

        expect(result.success).toBe(true);

        const collabs = await t.query(api.functions.listPickCollaborators, { pickId: pick.id });
        expect(collabs).toHaveLength(0);
    });

    it("throws when collaborator not found", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await expect(
            t.mutation(api.functions.removePickCollaborator, {
                pickId: pick.id,
                creatorId: "nonexistent",
            })
        ).rejects.toThrow("Collaborator not found");
    });
});

// ---------------------------------------------------------------------------
// setPickCollaborators (atomic replace)
// ---------------------------------------------------------------------------

describe("picks/collaborators — setPickCollaborators", () => {
    it("sets collaborators atomically with valid splits", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        const result = await t.mutation(api.functions.setPickCollaborators, {
            tenantId: TENANT,
            pickId: pick.id,
            collaborators: [
                { creatorId: CREATOR_A, role: "lead", splitPercent: 60 },
                { creatorId: CREATOR_B, role: "contributor", splitPercent: 40 },
            ],
        });

        expect(result.success).toBe(true);

        const collabs = await t.query(api.functions.listPickCollaborators, { pickId: pick.id });
        expect(collabs).toHaveLength(2);
    });

    it("replaces existing collaborators", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await t.mutation(api.functions.setPickCollaborators, {
            tenantId: TENANT,
            pickId: pick.id,
            collaborators: [
                { creatorId: CREATOR_A, role: "lead", splitPercent: 100 },
            ],
        });

        await t.mutation(api.functions.setPickCollaborators, {
            tenantId: TENANT,
            pickId: pick.id,
            collaborators: [
                { creatorId: CREATOR_B, role: "lead", splitPercent: 50 },
                { creatorId: CREATOR_C, role: "contributor", splitPercent: 50 },
            ],
        });

        const collabs = await t.query(api.functions.listPickCollaborators, { pickId: pick.id });
        expect(collabs).toHaveLength(2);
        expect(collabs.map((c: any) => c.creatorId).sort()).toEqual([CREATOR_B, CREATOR_C].sort());
    });

    it("rejects splits not summing to 100%", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await expect(
            t.mutation(api.functions.setPickCollaborators, {
                tenantId: TENANT,
                pickId: pick.id,
                collaborators: [
                    { creatorId: CREATOR_A, role: "lead", splitPercent: 60 },
                    { creatorId: CREATOR_B, role: "contributor", splitPercent: 30 },
                ],
            })
        ).rejects.toThrow("must sum to 100%");
    });

    it("rejects duplicate creators", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await expect(
            t.mutation(api.functions.setPickCollaborators, {
                tenantId: TENANT,
                pickId: pick.id,
                collaborators: [
                    { creatorId: CREATOR_A, role: "lead", splitPercent: 50 },
                    { creatorId: CREATOR_A, role: "contributor", splitPercent: 50 },
                ],
            })
        ).rejects.toThrow("Duplicate creator");
    });

    it("rejects more than 5 collaborators", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        const collaborators = Array.from({ length: 6 }, (_, i) => ({
            creatorId: `creator-${i}`,
            role: i === 0 ? "lead" : "contributor",
            splitPercent: Math.floor(100 / 6),
        }));
        // Adjust last to sum to 100
        collaborators[5].splitPercent = 100 - collaborators.slice(0, 5).reduce((s, c) => s + c.splitPercent, 0);

        await expect(
            t.mutation(api.functions.setPickCollaborators, {
                tenantId: TENANT,
                pickId: pick.id,
                collaborators,
            })
        ).rejects.toThrow("Maximum 5 collaborators");
    });
});

// ---------------------------------------------------------------------------
// validatePickSplits
// ---------------------------------------------------------------------------

describe("picks/collaborators — validatePickSplits", () => {
    it("returns valid when splits sum to 100%", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        await t.mutation(api.functions.setPickCollaborators, {
            tenantId: TENANT,
            pickId: pick.id,
            collaborators: [
                { creatorId: CREATOR_A, role: "lead", splitPercent: 60 },
                { creatorId: CREATOR_B, role: "contributor", splitPercent: 40 },
            ],
        });

        const result = await t.query(api.functions.validatePickSplits, { pickId: pick.id });
        expect(result.valid).toBe(true);
        expect(result.totalPercent).toBe(100);
        expect(result.collaboratorCount).toBe(2);
    });

    it("returns invalid when no collaborators", async () => {
        const t = convexTest(schema, modules);
        const pick = await createPick(t);

        const result = await t.query(api.functions.validatePickSplits, { pickId: pick.id });
        expect(result.valid).toBe(false);
        expect(result.totalPercent).toBe(0);
        expect(result.collaboratorCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// listPicksByCollaborator
// ---------------------------------------------------------------------------

describe("picks/collaborators — listPicksByCollaborator", () => {
    it("lists picks where a creator is a collaborator", async () => {
        const t = convexTest(schema, modules);
        const pick1 = await createPick(t);
        const pick2 = await createPick(t, { creatorId: CREATOR_B });

        // Add CREATOR_B as collaborator on pick1
        await t.mutation(api.functions.addPickCollaborator, {
            tenantId: TENANT,
            pickId: pick1.id,
            creatorId: CREATOR_B,
            role: "contributor",
            splitPercent: 30,
        });

        const picks = await t.query(api.functions.listPicksByCollaborator, {
            tenantId: TENANT,
            creatorId: CREATOR_B,
        });

        expect(picks).toHaveLength(1);
        expect(picks[0].collaboratorRole).toBe("contributor");
        expect(picks[0].collaboratorSplit).toBe(30);
    });

    it("returns empty for non-collaborator", async () => {
        const t = convexTest(schema, modules);
        await createPick(t);

        const picks = await t.query(api.functions.listPicksByCollaborator, {
            tenantId: TENANT,
            creatorId: CREATOR_C,
        });

        expect(picks).toHaveLength(0);
    });
});
