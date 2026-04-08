/**
 * Evidence Collection Helpers
 *
 * Captures screenshots, exports, and artifacts during A-krav test runs
 * for tender submission evidence packs.
 */

import { Page, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EVIDENCE_DIR = path.resolve(process.cwd(), "evidence");

/** Ensure evidence subdirectory exists. */
function ensureDir(subdir: string): string {
  const dir = path.join(EVIDENCE_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Sanitize a string for use as filename. */
function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 80);
}

/**
 * Capture a labeled screenshot for evidence.
 * Saves to evidence/screenshots/{testId}_{label}.png
 */
export async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  label: string
): Promise<string> {
  const dir = ensureDir("screenshots");
  const testId = sanitize(testInfo.title);
  const filename = `${testId}_${sanitize(label)}.png`;
  const filepath = path.join(dir, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  // Also attach to Playwright report
  await testInfo.attach(`evidence-${label}`, {
    path: filepath,
    contentType: "image/png",
  });

  return filepath;
}

/**
 * Capture a screenshot pair (before/after) for evidence.
 */
export async function captureBeforeAfter(
  page: Page,
  testInfo: TestInfo,
  label: string,
  action: () => Promise<void>
): Promise<{ before: string; after: string }> {
  const before = await captureEvidence(page, testInfo, `${label}_before`);
  await action();
  const after = await captureEvidence(page, testInfo, `${label}_after`);
  return { before, after };
}

/**
 * Save a JSON artifact (e.g. axe report, audit log, reconciliation).
 */
export function saveJsonEvidence(
  testInfo: TestInfo,
  subdir: string,
  label: string,
  data: unknown
): string {
  const dir = ensureDir(subdir);
  const testId = sanitize(testInfo.title);
  const filename = `${testId}_${sanitize(label)}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");

  testInfo.attach(`evidence-${label}`, {
    path: filepath,
    contentType: "application/json",
  });

  return filepath;
}

/**
 * Save a CSV artifact captured during test (e.g. exported report).
 */
export function saveCsvEvidence(
  testInfo: TestInfo,
  label: string,
  csvContent: string
): string {
  const dir = ensureDir("exports");
  const testId = sanitize(testInfo.title);
  const filename = `${testId}_${sanitize(label)}.csv`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, csvContent, "utf-8");

  testInfo.attach(`evidence-${label}`, {
    path: filepath,
    contentType: "text/csv",
  });

  return filepath;
}

/**
 * Capture the download triggered by a button click.
 * Returns the path to the saved file.
 */
export async function captureDownload(
  page: Page,
  testInfo: TestInfo,
  label: string,
  triggerDownload: () => Promise<void>
): Promise<string | null> {
  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }),
      triggerDownload(),
    ]);

    const dir = ensureDir("exports");
    const testId = sanitize(testInfo.title);
    const ext = path.extname(download.suggestedFilename()) || ".bin";
    const filename = `${testId}_${sanitize(label)}${ext}`;
    const filepath = path.join(dir, filename);

    await download.saveAs(filepath);

    testInfo.attach(`evidence-${label}`, {
      path: filepath,
      contentType: "application/octet-stream",
    });

    return filepath;
  } catch {
    return null;
  }
}
