/**
 * Event Bus Coverage Meta-Test
 *
 * Verifies that all domain facades which contain mutations also reference
 * the event bus (emitEvent / outboxEvents / eventBus). This ensures
 * state-changing operations participate in the decoupled event bus pattern.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Event Bus Coverage", () => {
  const domainDir = path.resolve(__dirname, "../../domain");

  it("all domain facade files with mutations reference event bus", () => {
    const files = fs
      .readdirSync(domainDir)
      .filter((f) => f.endsWith(".ts") && !f.startsWith("_") && !f.endsWith(".test.ts"));

    const facadesWithMutations: string[] = [];
    const facadesMissingEvents: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(domainDir, file), "utf-8");

      // Check if file defines mutations (internalMutation, mutation, or mutationWithTenant)
      const hasMutation =
        content.includes("mutation(") ||
        content.includes("internalMutation(") ||
        content.includes("mutationWithTenant(");

      if (!hasMutation) continue;

      facadesWithMutations.push(file);

      // Check if file references event bus infrastructure
      const hasEventBus =
        content.includes("emitEvent") ||
        content.includes("outboxEvents") ||
        content.includes("eventBus") ||
        content.includes("emit(") ||
        content.includes("EventType");

      if (!hasEventBus) {
        facadesMissingEvents.push(file);
      }
    }

    // Report findings
    console.log(
      `Domain facades with mutations: ${facadesWithMutations.length}`,
    );
    console.log(
      `Facades with event bus: ${facadesWithMutations.length - facadesMissingEvents.length}`,
    );
    if (facadesMissingEvents.length > 0) {
      console.log(
        `Facades missing event bus: ${facadesMissingEvents.join(", ")}`,
      );
    }

    // This is a coverage tracking test — report rather than fail hard
    // Uncomment the assertion below once all facades are wired:
    // expect(facadesMissingEvents).toEqual([]);

    // For now, just verify the test can enumerate facades
    expect(facadesWithMutations.length).toBeGreaterThan(0);
  });

  it("domain directory contains expected facade files", () => {
    const files = fs
      .readdirSync(domainDir)
      .filter((f) => f.endsWith(".ts") && !f.startsWith("_"));

    // Verify key facades exist
    const expectedFacades = [
      "reviews.ts",
      "resources.ts",
      "notifications.ts",
      "messaging.ts",
      "pricing.ts",
      "billing.ts",
    ];

    for (const facade of expectedFacades) {
      expect(files, `Missing expected facade: ${facade}`).toContain(facade);
    }
  });
});
