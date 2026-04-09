#!/usr/bin/env node

/**
 * Post-clone setup script for the SaaS template.
 *
 * Configures a freshly cloned repo:
 *   1. Collects project name, package scope, and tagline
 *   2. Replaces @digipicks/ scope across all source files
 *   3. Updates branding (env, manifests, author)
 *   4. Cleans CI workflow files
 *   5. Initializes Convex backend
 *   6. Installs dependencies
 *
 * Usage:
 *   node scripts/setup.mjs
 *   pnpm setup
 *
 * Requirements: Node >= 20, no npm packages needed.
 */

import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function heading(text) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${'='.repeat(60)}\n`);
}

function info(text) {
  console.log(`  [info] ${text}`);
}

function success(text) {
  console.log(`  [done] ${text}`);
}

function warn(text) {
  console.log(`  [warn] ${text}`);
}

function error(text) {
  console.error(`  [error] ${text}`);
}

/** File extensions eligible for scope replacement. */
const REPLACE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.css',
  '.html',
  '.md',
  '.mts',
  '.cts',
]);

/** Directory names to skip entirely. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  '.convex',
  '_generated',
  '.turbo',
  '.cache',
  'coverage',
]);

/**
 * Recursively collect file paths under `dir` that match our extension list.
 */
function collectFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github' && entry.name !== '.env.example') {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (REPLACE_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Replace all occurrences of `oldStr` with `newStr` in the given file.
 * Returns true if the file was modified.
 */
function replaceInFile(filePath, oldStr, newStr) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return false;
  }
  if (!content.includes(oldStr)) return false;
  const updated = content.replaceAll(oldStr, newStr);
  writeFileSync(filePath, updated, 'utf-8');
  return true;
}

/**
 * Run a shell command, printing output. Returns true on success.
 */
function run(cmd, opts = {}) {
  info(`Running: ${cmd}`);
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      ...opts,
    });
    return true;
  } catch (e) {
    warn(`Command failed: ${cmd}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function collectInput() {
  heading('Project Setup');
  console.log('  This script configures a freshly cloned SaaS template repo.');
  console.log('  Press Enter to accept defaults shown in parentheses.\n');

  const projectName = await ask('Project name', 'My SaaS Platform');
  const scopeRaw = await ask('Package scope (e.g. @mycompany)', '@mycompany');
  const scope = scopeRaw.startsWith('@') ? scopeRaw : `@${scopeRaw}`;
  const tagline = await ask('Tagline', 'Your tagline');

  console.log('');
  info(`Project name : ${projectName}`);
  info(`Package scope: ${scope}`);
  info(`Tagline      : ${tagline}`);
  console.log('');

  const confirm = await ask('Proceed? (y/n)', 'y');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  return { projectName, scope, tagline };
}

function replaceScope(scope) {
  heading('Step 1/5 -- Replace package scope');

  const oldScope = '@digipicks/';
  const newScope = `${scope}/`;

  if (oldScope === newScope) {
    info('Scope is already @digilist-saas -- skipping.');
    return;
  }

  const files = collectFiles(ROOT);
  let modified = 0;

  for (const filePath of files) {
    if (replaceInFile(filePath, oldScope, newScope)) {
      modified++;
    }
  }

  // Also replace the bare name "digilist-saas" in root package.json (the "name" field)
  const rootPkg = join(ROOT, 'package.json');
  replaceInFile(rootPkg, '"digilist-saas"', `"${scope.slice(1)}-platform"`);

  success(`Replaced "${oldScope}" -> "${newScope}" in ${modified} files.`);
}

function updateBranding(projectName, scope, tagline) {
  heading('Step 2/5 -- Update branding');

  // --- .env.local ---
  const envPath = join(ROOT, '.env.local');
  const envExamplePath = join(ROOT, '.env.example');

  const envLines = [
    '# Generated by scripts/setup.mjs',
    '#',
    '# Copy additional settings from .env.example as needed.',
    '',
    '# App URLs',
    'VITE_WEB_APP_URL=http://localhost:5190',
    'VITE_DASHBOARD_URL=http://localhost:5180',
    '',
    '# Platform Branding',
    `PLATFORM_NAME=${projectName}`,
    `VITE_PLATFORM_NAME=${projectName}`,
    `VITE_PLATFORM_TAGLINE=${tagline}`,
    '',
  ];

  if (existsSync(envPath)) {
    // Append only if the keys are not already present
    const existing = readFileSync(envPath, 'utf-8');
    if (!existing.includes('VITE_PLATFORM_NAME=')) {
      writeFileSync(envPath, existing + '\n' + envLines.join('\n'), 'utf-8');
      info('Appended branding vars to existing .env.local');
    } else {
      info('.env.local already has VITE_PLATFORM_NAME -- skipping.');
    }
  } else {
    writeFileSync(envPath, envLines.join('\n'), 'utf-8');
    info('Created .env.local with branding vars.');
  }

  // --- Root package.json author ---
  const rootPkg = join(ROOT, 'package.json');
  if (existsSync(rootPkg)) {
    replaceInFile(rootPkg, '"Xala Technologies"', `"${projectName}"`);
    info('Updated author in root package.json.');
  }

  // --- PWA manifests in vite configs ---
  for (const app of ['web', 'dashboard']) {
    const viteConfig = join(ROOT, 'apps', app, 'vite.config.ts');
    if (!existsSync(viteConfig)) continue;

    let content = readFileSync(viteConfig, 'utf-8');
    let changed = false;

    // Replace manifest name values
    const namePatterns = [
      [/name:\s*'[^']*'/, `name: '${projectName}'`],
      [/short_name:\s*'[^']*'/, `short_name: '${projectName}'`],
    ];

    for (const [pattern, replacement] of namePatterns) {
      if (pattern.test(content)) {
        // Only replace the first two occurrences (inside manifest block)
        content = content.replace(pattern, replacement);
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(viteConfig, content, 'utf-8');
      info(`Updated PWA manifest in apps/${app}/vite.config.ts`);
    }
  }

  success('Branding updated.');
}

function cleanCIWorkflows() {
  heading('Step 3/5 -- Clean CI workflows');

  const workflowDir = join(ROOT, '.github', 'workflows');
  if (!existsSync(workflowDir)) {
    info('No .github/workflows directory found -- skipping.');
    return;
  }

  let modified = 0;
  const files = readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filePath = join(workflowDir, file);
    let content = readFileSync(filePath, 'utf-8');
    const original = content;

    // Remove registry-url lines
    content = content.replace(/^\s*registry-url:\s*'https:\/\/npm\.pkg\.github\.com'\s*\n/gm, '');

    // Remove scope lines for @xala-technologies
    content = content.replace(/^\s*scope:\s*'@xala-technologies'\s*\n/gm, '');

    // Remove NODE_AUTH_TOKEN env lines (tied to GitHub Packages auth)
    content = content.replace(/^\s*NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}\s*\n/gm, '');

    if (content !== original) {
      writeFileSync(filePath, content, 'utf-8');
      modified++;
      info(`Cleaned ${file}`);
    }
  }

  success(`Cleaned ${modified} workflow file(s).`);
}

function initializeConvex() {
  heading('Step 4/5 -- Initialize Convex');

  info('Running npx convex dev --once to create a new deployment...');
  info('(This may prompt you to log in to Convex if not already authenticated.)\n');

  const ok = run('npx convex dev --once');
  if (ok) {
    success('Convex initialized.');
  } else {
    warn('Convex initialization failed or was skipped.');
    warn("You can run 'npx convex dev' later to set up your backend.");
  }
}

function installDependencies() {
  heading('Step 5/5 -- Install dependencies');

  const ok = run('pnpm install');
  if (ok) {
    success('Dependencies installed.');
  } else {
    warn('pnpm install failed. You may need to run it manually.');
  }
}

function printSuccess(projectName, scope) {
  heading('Setup Complete!');

  console.log(`  Your project "${projectName}" is ready.`);
  console.log('');
  console.log('  Next steps:');
  console.log('');
  console.log('    1. Start the dev server:');
  console.log('       pnpm dev');
  console.log('');
  console.log('    2. Seed the database (optional):');
  console.log('       pnpm seed:all');
  console.log('');
  console.log('    3. Open the apps:');
  console.log('       Dashboard: http://localhost:5180');
  console.log('       Web:       http://localhost:5190');
  console.log('');
  console.log('    4. Configure authentication and payments:');
  console.log('       See .env.example for all available environment variables.');
  console.log('');
  console.log(`  All packages now use the ${scope}/ scope.`);
  console.log('  See CLAUDE.md for full architecture docs.\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    const { projectName, scope, tagline } = await collectInput();

    replaceScope(scope);
    updateBranding(projectName, scope, tagline);
    cleanCIWorkflows();
    initializeConvex();
    installDependencies();
    printSuccess(projectName, scope);
  } catch (e) {
    error(e.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
