/**
 * Command: xala verify <app>
 *
 * Runs policy checks against generated and existing code.
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { printHeader } from '../lib/fs-helpers.js';
import { APPS, ROOT_DIR } from '../lib/constants.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface Violation {
  ruleId: string;
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

export function verifyCommand(): Command {
  return new Command('verify')
    .description('Run policy checks on an app')
    .argument('<app>', `App to verify (${APPS.join(', ')})`)
    .option('--files <glob>', 'Specific files to check (comma-separated)')
    .option('--rules <rules>', 'Specific rule IDs to run (comma-separated)')
    .action(async (app: string, opts) => {
      await run(app, opts);
    });
}

async function run(app: string, opts: { files?: string; rules?: string }): Promise<void> {
  printHeader(`Verify: ${app}`);

  if (!APPS.includes(app as any)) {
    console.error(`Invalid app: "${app}". Must be one of: ${APPS.join(', ')}`);
    process.exit(1);
  }

  const routesDir = path.join(ROOT_DIR, 'apps', app, 'src', 'routes');
  if (!fs.existsSync(routesDir)) {
    console.error(`Routes directory not found: ${routesDir}`);
    process.exit(1);
  }

  const activeRules = opts.rules ? opts.rules.split(',').map((r) => r.trim()) : null;
  const allViolations: Violation[] = [];

  // Collect files
  const tsxFiles = collectFiles(routesDir, '.tsx', opts.files);
  const cssFiles = collectFiles(routesDir, '.module.css', opts.files);
  const appTsxPath = path.join(ROOT_DIR, 'apps', app, 'src', 'App.tsx');

  // Run checks
  if (!activeRules || activeRules.includes('NO_RAW_HTML')) {
    const v = checkNoRawHtml(tsxFiles);
    allViolations.push(...v);
    printCheckResult('NO_RAW_HTML', v, tsxFiles.length);
  }

  if (!activeRules || activeRules.includes('I18N_REQUIRED')) {
    const v = checkI18nRequired(tsxFiles);
    allViolations.push(...v);
    printCheckResult('I18N_REQUIRED', v, tsxFiles.length);
  }

  if (!activeRules || activeRules.includes('DS_IMPORTS_ONLY')) {
    const v = checkDsImportsOnly(tsxFiles);
    allViolations.push(...v);
    printCheckResult('DS_IMPORTS_ONLY', v, tsxFiles.length);
  }

  if (!activeRules || activeRules.includes('CSS_MODULE_ONLY')) {
    const v = checkCssModuleOnly(tsxFiles);
    allViolations.push(...v);
    printCheckResult('CSS_MODULE_ONLY', v, tsxFiles.length);
  }

  if (!activeRules || activeRules.includes('NO_HARDCODED_COLORS')) {
    const v = checkNoHardcodedColors(cssFiles);
    allViolations.push(...v);
    printCheckResult('NO_HARDCODED_COLORS', v, cssFiles.length);
  }

  if (!activeRules || activeRules.includes('TOKEN_SPACING_ONLY')) {
    const v = checkTokenSpacingOnly(cssFiles);
    allViolations.push(...v);
    printCheckResult('TOKEN_SPACING_ONLY', v, cssFiles.length);
  }

  if ((!activeRules || activeRules.includes('ROUTE_GUARD_PRESENT')) && app === 'dashboard') {
    const v = checkRouteGuardPresent(appTsxPath);
    allViolations.push(...v);
    printCheckResult('ROUTE_GUARD_PRESENT', v);
  }

  // Summary
  const errors = allViolations.filter((v) => v.severity === 'error');
  const warnings = allViolations.filter((v) => v.severity === 'warning');

  console.log('');
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}${BOLD}All checks passed!${RESET}`);
  } else {
    console.log(
      `${BOLD}Summary:${RESET} ${errors.length} error(s), ${warnings.length} warning(s)` +
        (errors.length > 0 ? ` ${RED}— FIX REQUIRED${RESET}` : ''),
    );
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

function collectFiles(dir: string, ext: string, specificFiles?: string): string[] {
  if (specificFiles) {
    return specificFiles
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.endsWith(ext));
  }

  const files: string[] = [];
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) files.push(full);
    }
  }
  walk(dir);
  return files;
}

function printCheckResult(ruleId: string, violations: Violation[], fileCount?: number): void {
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');

  const padded = ruleId.padEnd(24);
  const filesStr = fileCount !== undefined ? ` in ${fileCount} file(s)` : '';

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ${GREEN}PASS${RESET}  ${padded}(0 violations${filesStr})`);
  } else if (errors.length > 0) {
    console.log(`  ${RED}FAIL${RESET}  ${padded}(${errors.length} error(s)${filesStr})`);
    for (const v of errors.slice(0, 5)) {
      const loc = v.line ? `:${v.line}` : '';
      console.log(`        ${relativePath(v.file)}${loc}  ${v.message}`);
    }
    if (errors.length > 5) {
      console.log(`        ... and ${errors.length - 5} more`);
    }
  } else {
    console.log(`  ${YELLOW}WARN${RESET}  ${padded}(${warnings.length} warning(s)${filesStr})`);
    for (const v of warnings.slice(0, 3)) {
      const loc = v.line ? `:${v.line}` : '';
      console.log(`        ${relativePath(v.file)}${loc}  ${v.message}`);
    }
  }
}

function relativePath(fullPath: string): string {
  return path.relative(ROOT_DIR, fullPath);
}

// ============================================================================
// Policy check implementations
// ============================================================================

const RAW_HTML_TAGS = [
  '<button',
  '<input',
  '<select',
  '<textarea',
  '<table',
  '<h1',
  '<h2',
  '<h3',
  '<h4',
  '<h5',
  '<h6',
  '<p>',
];

function checkNoRawHtml(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      for (const tag of RAW_HTML_TAGS) {
        if (line.includes(tag) && !line.includes('// eslint-disable')) {
          violations.push({
            ruleId: 'NO_RAW_HTML',
            file,
            line: i + 1,
            message: `Raw HTML tag "${tag.replace('<', '')}" — use DS component instead`,
            severity: 'error',
          });
        }
      }
    }
  }
  return violations;
}

function checkI18nRequired(files: string[]): Violation[] {
  const violations: Violation[] = [];

  // Match hardcoded string attributes on DS-relevant props
  const attrPatterns = [/\baria-label="([^"]+)"/, /\bplaceholder="([^"]+)"/, /\btitle="([^"]+)"/, /\balt="([^"]+)"/];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      for (const pattern of attrPatterns) {
        const match = line.match(pattern);
        if (match) {
          const value = match[1];
          // Allow pure non-word values (e.g., "...", URLs)
          if (/^[^a-zA-ZæøåÆØÅ]*$/.test(value)) continue;
          violations.push({
            ruleId: 'I18N_REQUIRED',
            file,
            line: i + 1,
            message: `Hardcoded string "${value}" — use t() from @digipicks/i18n`,
            severity: 'warning',
          });
        }
      }
    }
  }
  return violations;
}

function checkDsImportsOnly(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const forbidden = ['@digdir/designsystemet-react', '@digdir/designsystemet-css', '@radix-ui/', '@mui/', 'antd'];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('import ')) continue;
      for (const lib of forbidden) {
        if (line.includes(`'${lib}`) || line.includes(`"${lib}`)) {
          violations.push({
            ruleId: 'DS_IMPORTS_ONLY',
            file,
            line: i + 1,
            message: `Direct import from "${lib}" — use @digipicks/ds instead`,
            severity: 'error',
          });
        }
      }
    }
  }
  return violations;
}

function checkCssModuleOnly(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match: import ... from './something.css' (not .module.css)
      const match = line.match(/from\s+['"]([^'"]+\.css)['"]/);
      if (match && !match[1].endsWith('.module.css')) {
        violations.push({
          ruleId: 'CSS_MODULE_ONLY',
          file,
          line: i + 1,
          message: `Plain CSS import "${match[1]}" — use .module.css`,
          severity: 'error',
        });
      }
    }
  }
  return violations;
}

function checkNoHardcodedColors(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
  const rgbPattern = /\brgba?\s*\(/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('//')) continue;

      // Check for hex colors not inside var() fallback
      if (hexPattern.test(line)) {
        const inVarFallback = /var\([^)]*,\s*#[0-9a-fA-F]{3,8}/.test(line);
        if (inVarFallback) {
          violations.push({
            ruleId: 'NO_HARDCODED_COLORS',
            file,
            line: i + 1,
            message: 'Hex color in var() fallback — consider using token only',
            severity: 'warning',
          });
        } else {
          violations.push({
            ruleId: 'NO_HARDCODED_COLORS',
            file,
            line: i + 1,
            message: 'Hardcoded hex color — use --ds-color-* token',
            severity: 'error',
          });
        }
      }

      // Check for rgb/rgba
      if (rgbPattern.test(line) && !line.includes('var(--ds-')) {
        violations.push({
          ruleId: 'NO_HARDCODED_COLORS',
          file,
          line: i + 1,
          message: 'Hardcoded rgb/rgba color — use --ds-color-* token',
          severity: 'error',
        });
      }
    }
  }
  return violations;
}

function checkTokenSpacingOnly(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const spacingProps = /^[^:]*\b(padding|margin|gap|row-gap|column-gap|font-size|border-radius)\b[^:]*:/;
  const pxValue = /\d+px/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('//')) continue;

      if (spacingProps.test(line) && pxValue.test(line)) {
        // Exempt: 0, 1px, values inside var(), calc()
        if (line.includes('var(--ds-')) continue;
        if (line.includes('calc(')) continue;
        if (/:\s*0(?:px)?[;\s]/.test(line)) continue;
        if (/:\s*1px/.test(line) && line.includes('border')) continue;

        violations.push({
          ruleId: 'TOKEN_SPACING_ONLY',
          file,
          line: i + 1,
          message: 'Hardcoded px value — use --ds-size-* token',
          severity: 'warning',
        });
      }
    }
  }
  return violations;
}

function checkRouteGuardPresent(appTsxPath: string): Violation[] {
  const violations: Violation[] = [];
  if (!fs.existsSync(appTsxPath)) return violations;

  const content = fs.readFileSync(appTsxPath, 'utf-8');
  const lines = content.split('\n');

  // Exempt paths that don't need guards
  const exemptPaths = new Set([
    '/login',
    'login',
    '/auth/callback',
    'auth/callback',
    '/role-selection',
    'role-selection',
    '*',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pathMatch = line.match(/path="([^"]+)"/);
    if (!pathMatch) continue;

    const routePath = pathMatch[1];
    if (exemptPaths.has(routePath)) continue;
    if (routePath === '/' || routePath === '') continue; // Root layout

    // Look at the element prop in surrounding lines (up to 10 lines)
    const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 10)).join(' ');

    const hasGuard = context.includes('ProtectedRoute');
    const hasNavigate = context.includes('Navigate to');
    const isRedirect = context.includes('Navigate') && !context.includes('Page');

    if (!hasGuard && !hasNavigate && !isRedirect) {
      // Check if this route is inside a parent guard (root layout)
      const isChildRoute = line.includes('index') || line.match(/^\s{10,}/);
      if (!isChildRoute) {
        violations.push({
          ruleId: 'ROUTE_GUARD_PRESENT',
          file: appTsxPath,
          line: i + 1,
          message: `Route "${routePath}" lacks ProtectedRoute guard`,
          severity: 'error',
        });
      }
    }
  }

  return violations;
}
