#!/usr/bin/env node
/**
 * Load .env.local, map CONVEX_URL → CONVEX_SELF_HOSTED_URL and
 * CONVEX_ADMIN_KEY → CONVEX_SELF_HOSTED_ADMIN_KEY, then run convex command.
 * Lets existing .env.local work without requiring duplicate var names.
 */
import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnv(path) {
  const env = { ...process.env };
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i < 0) continue;
      const key = trimmed.slice(0, i).trim();
      let val = trimmed.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else {
        // Strip inline comments (# ...) for unquoted values
        const commentIdx = val.indexOf(' #');
        if (commentIdx >= 0) val = val.slice(0, commentIdx).trim();
      }
      env[key] = val;
    }
  } catch (e) {
    console.error("✖ .env.local not found. Copy .env.example to .env.local and fill values.");
    process.exit(1);
  }
  return env;
}

const env = loadEnv(envPath);
const convexUrl = env.CONVEX_URL || env.VITE_CONVEX_URL;
const isSelfHostedUrl = convexUrl && !convexUrl.includes(".convex.cloud");
if (!env.CONVEX_SELF_HOSTED_URL && isSelfHostedUrl) {
  env.CONVEX_SELF_HOSTED_URL = convexUrl;
}
if (!env.CONVEX_SELF_HOSTED_ADMIN_KEY && env.CONVEX_SELF_HOSTED_URL) {
  env.CONVEX_SELF_HOSTED_ADMIN_KEY = env.CONVEX_ADMIN_KEY || env.VITE_CONVEX_ADMIN_KEY;
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node run-convex-with-env.mjs <convex-command> [args...]");
  process.exit(1);
}

const child = spawn("npx", ["convex", ...cmd.split(" "), ...args], {
  cwd: root,
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
