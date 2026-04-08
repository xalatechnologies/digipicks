/**
 * Evidence Pack Exporter
 *
 * Collects all A-krav test evidence into a versioned ZIP for tender submission.
 * Run: npx tsx scripts/export-evidence-pack.ts
 *
 * Produces: evidence/evidence-pack-v{version}-{date}.zip
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as crypto from "crypto";

const EVIDENCE_DIR = path.resolve(process.cwd(), "evidence");
const TRACEABILITY_MD = path.resolve(
  process.cwd(),
  "tests/a-krav/A-KRAV-TRACEABILITY.md"
);
const TRACEABILITY_JSON = path.resolve(
  process.cwd(),
  "tests/a-krav/A-KRAV-TRACEABILITY.json"
);

function log(msg: string) {
  console.log(`[evidence-pack] ${msg}`);
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")
    );
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function getDate(): string {
  return new Date().toISOString().split("T")[0];
}

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) count++;
    if (entry.isDirectory())
      count += countFiles(path.join(dir, entry.name));
  }
  return count;
}

function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  A-krav Evidence Pack Exporter");
  console.log("═══════════════════════════════════════════\n");

  // Check evidence directory exists
  if (!fs.existsSync(EVIDENCE_DIR)) {
    console.error(
      "ERROR: evidence/ directory not found. Run A-krav tests first:"
    );
    console.error("  pnpm test:e2e:a-krav");
    process.exit(1);
  }

  // Copy traceability files into evidence
  if (fs.existsSync(TRACEABILITY_MD)) {
    fs.copyFileSync(
      TRACEABILITY_MD,
      path.join(EVIDENCE_DIR, "A-KRAV-TRACEABILITY.md")
    );
    log("✓ Copied traceability matrix (MD)");
  }
  if (fs.existsSync(TRACEABILITY_JSON)) {
    fs.copyFileSync(
      TRACEABILITY_JSON,
      path.join(EVIDENCE_DIR, "A-KRAV-TRACEABILITY.json")
    );
    log("✓ Copied traceability matrix (JSON)");
  }

  // Generate summary
  const subdirs = [
    "screenshots",
    "videos",
    "accessibility",
    "exports",
    "audit-logs",
    "reconciliation",
  ];
  const summary: Record<string, number> = {};
  for (const subdir of subdirs) {
    summary[subdir] = countFiles(path.join(EVIDENCE_DIR, subdir));
  }

  const summaryPath = path.join(EVIDENCE_DIR, "EVIDENCE-SUMMARY.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        version: getVersion(),
        date: getDate(),
        tenant: "E2E Demo Venue",
        tenantId: "qd71nzdbvssrm2n3n2018daspx81pftx",
        artifactCounts: summary,
        totalArtifacts: Object.values(summary).reduce((a, b) => a + b, 0),
      },
      null,
      2
    ),
    "utf-8"
  );
  log("✓ Generated evidence summary");

  // Create ZIP
  const version = getVersion();
  const date = getDate();
  const zipName = `evidence-pack-v${version}-${date}.zip`;
  const zipPath = path.join(EVIDENCE_DIR, zipName);

  try {
    execSync(`cd "${EVIDENCE_DIR}" && zip -r "${zipName}" . -x "${zipName}"`, {
      stdio: "pipe",
    });
    log(`✓ Created ZIP: evidence/${zipName}`);
  } catch {
    log("⚠ zip command not available, creating tar.gz instead");
    const tarName = `evidence-pack-v${version}-${date}.tar.gz`;
    execSync(
      `cd "${EVIDENCE_DIR}" && tar -czf "${tarName}" --exclude="${tarName}" .`,
      { stdio: "pipe" }
    );
    log(`✓ Created archive: evidence/${tarName}`);
  }

  // Generate SHA-256 checksum
  const archivePath = fs.existsSync(zipPath)
    ? zipPath
    : path.join(EVIDENCE_DIR, `evidence-pack-v${version}-${date}.tar.gz`);

  if (fs.existsSync(archivePath)) {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(archivePath))
      .digest("hex");
    const checksumPath = archivePath + ".sha256";
    fs.writeFileSync(checksumPath, `${hash}  ${path.basename(archivePath)}\n`);
    log(`✓ SHA-256: ${hash}`);
  }

  // Print summary
  console.log("\n═══════════════════════════════════════════");
  console.log("  Evidence Pack Summary");
  console.log("═══════════════════════════════════════════");
  for (const [subdir, count] of Object.entries(summary)) {
    console.log(`  ${subdir}: ${count} files`);
  }
  console.log(
    `  Total: ${Object.values(summary).reduce((a, b) => a + b, 0)} artifacts`
  );
  console.log("═══════════════════════════════════════════\n");
}

main();
