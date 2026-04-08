/**
 * Axe Accessibility Fixture
 *
 * Extends Playwright test with WCAG 2.1 AA accessibility scanning.
 * Results saved as JSON evidence for tender submission.
 */

import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { saveJsonEvidence } from "../helpers/evidence";

export const test = base.extend<{
  makeAxeBuilder: () => AxeBuilder;
}>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("#__next-build-indicator") // exclude dev-only elements
    );
  },
});

/**
 * Run an accessibility audit and assert zero violations.
 * Saves the full report as JSON evidence.
 */
export async function assertAccessible(
  page: Parameters<typeof base>[0] extends infer P ? P : never,
  testInfo: Parameters<typeof base>[1] extends infer T ? T : never,
  axeBuilder: AxeBuilder,
  label: string
): Promise<void> {
  const results = await axeBuilder.analyze();

  // Save full report as evidence
  saveJsonEvidence(
    testInfo as any,
    "accessibility",
    label,
    {
      url: results.url,
      timestamp: results.timestamp,
      violations: results.violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
    }
  );

  // Assert zero violations
  expect(
    results.violations,
    `Accessibility violations on ${label}:\n${results.violations
      .map((v) => `  - ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
      .join("\n")}`
  ).toHaveLength(0);
}

export { expect };
