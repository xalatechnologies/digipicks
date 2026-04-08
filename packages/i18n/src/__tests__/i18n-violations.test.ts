import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import nb from '../../locales/nb.json';
import en from '../../locales/en.json';
import ar from '../../locales/ar.json';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ---------------------------------------------------------------------------
// Ratchet thresholds — lower these as violations are fixed to lock in progress
// ---------------------------------------------------------------------------
const THRESHOLDS = {
  /** ar.json namespaces missing vs nb.json */
  arMissingNamespaces: 39,
  /** t('key') calls referencing keys absent from nb.json (excluding dynamic keys) */
  missingTKeys: 260,
  /** Hardcoded user-facing string attributes in apps/ */
  hardcodedApps: 10,
  /** Hardcoded user-facing string attributes in packages/ */
  hardcodedPackages: 345,
  /** nb.json leaf keys not referenced by any t() call */
  unusedKeys: 670,
  /** Top-level nb.json namespaces with zero t() references */
  unusedNamespaces: 9,
  /** nb↔en key pairs with identical values (len > 2, likely untranslated) */
  identicalNbEn: 110,
  /** nb values duplicated 4+ times (copy-paste smell) */
  highlyDuplicatedValues: 65,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NestedObj = Record<string, unknown>;

/** Recursively extract all dot-delimited leaf key paths. */
function getAllKeys(obj: NestedObj, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as NestedObj, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Recursively extract all [keyPath, leafValue] pairs. */
function getAllEntries(obj: NestedObj, prefix = ''): [string, unknown][] {
  const entries: [string, unknown][] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...getAllEntries(value as NestedObj, fullKey));
    } else {
      entries.push([fullKey, value]);
    }
  }
  return entries;
}

/** Extract sorted {{var}} interpolation variable names from a translation string. */
function getInterpolationVars(str: unknown): string[] {
  const matches = String(str).match(/\{\{(\w+)\}\}/g);
  return matches ? [...matches].sort() : [];
}

/** Recursively collect .ts/.tsx files, skipping node_modules/dist/tests. */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '__tests__', '.next', 'dist', '__mocks__'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Scan directories
// ---------------------------------------------------------------------------
const SCAN_DIRS = [
  'apps/web/src',
  'apps/backoffice/src',
  'apps/minside/src',
  'apps/saas-admin/src',
  'apps/monitoring/src',
  'packages/digilist/src',
].map((d) => path.join(PROJECT_ROOT, d));

// ---------------------------------------------------------------------------
// Lazy-cached file scan (shared by key-existence + unused-key blocks)
// ---------------------------------------------------------------------------
interface FileScanResult {
  /** All unique t() key strings extracted from code */
  tKeys: Set<string>;
  /** Static t() keys (no dynamic ${ patterns) */
  staticTKeys: Set<string>;
  /** All namespaces referenced in t() keys (first dotted segment) */
  usedNamespaces: Set<string>;
  /** Per-file hardcoded attribute counts for apps/ */
  hardcodedApps: Map<string, number>;
  /** Per-file hardcoded attribute counts for packages/ */
  hardcodedPackages: Map<string, number>;
}

let _scanCache: FileScanResult | undefined;

function scanCodebase(): FileScanResult {
  if (_scanCache) return _scanCache;

  const tKeys = new Set<string>();
  const staticTKeys = new Set<string>();
  const usedNamespaces = new Set<string>();
  const hardcodedApps = new Map<string, number>();
  const hardcodedPackages = new Map<string, number>();

  const tKeyRe = /\bt\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g;
  const hardcodedAttrRe = /(?:aria-label|aria-describedby|title|placeholder|alt|label)\s*=\s*["']([^"']+)["']/g;

  for (const dir of SCAN_DIRS) {
    const files = collectTsxFiles(dir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // Extract t() keys
      let m: RegExpExecArray | null;
      while ((m = tKeyRe.exec(content)) !== null) {
        const key = m[1];
        tKeys.add(key);
        if (!key.includes('$')) {
          staticTKeys.add(key);
          const ns = key.split('.')[0];
          if (ns) usedNamespaces.add(ns);
        }
      }
      tKeyRe.lastIndex = 0;

      // Extract hardcoded attributes (only from .tsx)
      if (file.endsWith('.tsx')) {
        let count = 0;
        while ((m = hardcodedAttrRe.exec(content)) !== null) {
          const val = m[1];
          // Skip non-user-facing values
          if (/^\d+$/.test(val) || /^[#/]/.test(val) || val === 'text' || val === 'button') continue;
          count++;
        }
        hardcodedAttrRe.lastIndex = 0;

        if (count > 0) {
          const rel = path.relative(PROJECT_ROOT, file);
          if (file.includes('/apps/')) {
            hardcodedApps.set(rel, count);
          } else if (file.includes('/packages/')) {
            hardcodedPackages.set(rel, count);
          }
        }
      }
    }
  }

  _scanCache = { tKeys, staticTKeys, usedNamespaces, hardcodedApps, hardcodedPackages };
  return _scanCache;
}

// ---------------------------------------------------------------------------
// Pre-computed locale data
// ---------------------------------------------------------------------------
const nbObj = nb as NestedObj;
const enObj = en as NestedObj;
const arObj = ar as NestedObj;

const nbKeys = getAllKeys(nbObj);
const enKeys = getAllKeys(enObj);
const arKeys = getAllKeys(arObj);

const nbKeySet = new Set(nbKeys);
const enKeySet = new Set(enKeys);
const arKeySet = new Set(arKeys);

const nbEntries = getAllEntries(nbObj);
const enEntries = getAllEntries(enObj);
const enMap = new Map(enEntries);
const arMap = new Map(getAllEntries(arObj));

const nbNamespaces = Object.keys(nbObj);
const enNamespaces = Object.keys(enObj);
const arNamespaces = Object.keys(arObj);

// ===========================================================================
// TESTS
// ===========================================================================

describe('i18n violations', () => {
  // -------------------------------------------------------------------------
  // 1. Namespace consistency
  // -------------------------------------------------------------------------
  describe('Namespace consistency', () => {
    it('every nb namespace exists in en (strict)', () => {
      const missing = nbNamespaces.filter((ns) => !enNamespaces.includes(ns));
      if (missing.length > 0) {
        console.warn(`Missing en namespaces: ${missing.join(', ')}`);
      }
      expect(missing.length).toBe(0);
    });

    it('every en namespace exists in nb (strict)', () => {
      const extra = enNamespaces.filter((ns) => !nbNamespaces.includes(ns));
      if (extra.length > 0) {
        console.warn(`Extra en namespaces not in nb: ${extra.join(', ')}`);
      }
      expect(extra.length).toBe(0);
    });

    it(`ar missing namespace count does not increase (ratchet: ${THRESHOLDS.arMissingNamespaces})`, () => {
      const missing = nbNamespaces.filter((ns) => !arNamespaces.includes(ns));
      console.warn(
        `ar.json missing ${missing.length} of ${nbNamespaces.length} namespaces ` +
          `(threshold: ${THRESHOLDS.arMissingNamespaces})`
      );
      expect(missing.length).toBeLessThanOrEqual(THRESHOLDS.arMissingNamespaces);
    });

    it('per-namespace key count delta nb↔en within tolerance', () => {
      const deltas: Array<{ ns: string; nb: number; en: number; delta: number }> = [];
      for (const ns of nbNamespaces) {
        const nsNb = nbKeys.filter((k) => k.startsWith(`${ns}.`)).length;
        const nsEn = enKeys.filter((k) => k.startsWith(`${ns}.`)).length;
        const delta = Math.abs(nsNb - nsEn);
        if (delta > 0) {
          deltas.push({ ns, nb: nsNb, en: nsEn, delta });
        }
      }
      if (deltas.length > 0) {
        console.warn(
          `Namespace key count differences nb↔en:\n` +
            deltas.map((d) => `  ${d.ns}: nb=${d.nb} en=${d.en} (Δ${d.delta})`).join('\n')
        );
      }
      // Total delta across all namespaces should stay small
      const totalDelta = deltas.reduce((sum, d) => sum + d.delta, 0);
      expect(totalDelta).toBeLessThanOrEqual(30);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Interpolation consistency
  // -------------------------------------------------------------------------
  describe('Interpolation consistency', () => {
    it('{{var}} patterns in nb match en for all shared keys (strict)', () => {
      const mismatches: Array<{ key: string; nb: string[]; en: string[] }> = [];
      for (const [key, val] of nbEntries) {
        const nbVars = getInterpolationVars(val);
        if (nbVars.length === 0) continue;
        if (!enMap.has(key)) continue;
        const enVars = getInterpolationVars(enMap.get(key));
        if (JSON.stringify(nbVars) !== JSON.stringify(enVars)) {
          mismatches.push({ key, nb: nbVars, en: enVars });
        }
      }
      if (mismatches.length > 0) {
        console.warn(
          `Interpolation mismatches nb↔en:\n` +
            mismatches.map((m) => `  ${m.key}: nb=${m.nb.join(',')} en=${m.en.join(',')}`).join('\n')
        );
      }
      expect(mismatches.length).toBe(0);
    });

    it('{{var}} patterns in nb match ar for all shared keys (strict)', () => {
      const mismatches: Array<{ key: string; nb: string[]; ar: string[] }> = [];
      for (const [key, val] of nbEntries) {
        const nbVars = getInterpolationVars(val);
        if (nbVars.length === 0) continue;
        if (!arMap.has(key)) continue;
        const arVars = getInterpolationVars(arMap.get(key));
        if (JSON.stringify(nbVars) !== JSON.stringify(arVars)) {
          mismatches.push({ key, nb: nbVars, ar: arVars });
        }
      }
      if (mismatches.length > 0) {
        console.warn(
          `Interpolation mismatches nb↔ar:\n` +
            mismatches.map((m) => `  ${m.key}: nb=${m.nb.join(',')} ar=${m.ar.join(',')}`).join('\n')
        );
      }
      expect(mismatches.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Translation key existence
  // -------------------------------------------------------------------------
  describe('Translation key existence', () => {
    it(`t() keys missing from nb.json does not increase (ratchet: ${THRESHOLDS.missingTKeys})`, () => {
      const { staticTKeys } = scanCodebase();
      const missing = [...staticTKeys].filter((key) => !nbKeySet.has(key));
      console.warn(
        `t() keys missing from nb.json: ${missing.length} of ${staticTKeys.size} ` +
          `(threshold: ${THRESHOLDS.missingTKeys})`
      );
      if (missing.length > 0 && missing.length <= 30) {
        console.warn(`  Sample: ${missing.slice(0, 20).join(', ')}`);
      }
      expect(missing.length).toBeLessThanOrEqual(THRESHOLDS.missingTKeys);
    });

    it('namespaces referenced in t() calls exist in nb.json', () => {
      const { usedNamespaces } = scanCodebase();
      const nbNsSet = new Set(nbNamespaces);
      const missingNs = [...usedNamespaces].filter((ns) => !nbNsSet.has(ns));
      if (missingNs.length > 0) {
        console.warn(`Namespaces used in code but missing from nb.json: ${missingNs.join(', ')}`);
      }
      // Some namespace references may be partial key segments — allow a few
      expect(missingNs.length).toBeLessThanOrEqual(20);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Hardcoded string detection
  // -------------------------------------------------------------------------
  describe('Hardcoded string detection', () => {
    it(`hardcoded attributes in apps/ does not increase (ratchet: ${THRESHOLDS.hardcodedApps})`, () => {
      const { hardcodedApps } = scanCodebase();
      const total = [...hardcodedApps.values()].reduce((s, c) => s + c, 0);
      console.warn(
        `Hardcoded user-facing attributes in apps/: ${total} ` +
          `(threshold: ${THRESHOLDS.hardcodedApps})`
      );
      expect(total).toBeLessThanOrEqual(THRESHOLDS.hardcodedApps);
    });

    it(`hardcoded attributes in packages/ does not increase (ratchet: ${THRESHOLDS.hardcodedPackages})`, () => {
      const { hardcodedPackages } = scanCodebase();
      const total = [...hardcodedPackages.values()].reduce((s, c) => s + c, 0);
      console.warn(
        `Hardcoded user-facing attributes in packages/: ${total} ` +
          `(threshold: ${THRESHOLDS.hardcodedPackages})`
      );
      if (hardcodedPackages.size > 0) {
        const top = [...hardcodedPackages.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        console.warn(
          `  Top offenders:\n` + top.map(([f, c]) => `    ${c} ${f}`).join('\n')
        );
      }
      expect(total).toBeLessThanOrEqual(THRESHOLDS.hardcodedPackages);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Unused translation keys
  // -------------------------------------------------------------------------
  describe('Unused translation keys', () => {
    it(`nb.json keys not referenced in code does not increase (ratchet: ${THRESHOLDS.unusedKeys})`, () => {
      const { staticTKeys } = scanCodebase();
      const unused = nbKeys.filter((k) => !staticTKeys.has(k));
      console.warn(
        `Unused nb.json keys: ${unused.length} of ${nbKeys.length} ` +
          `(threshold: ${THRESHOLDS.unusedKeys})`
      );
      expect(unused.length).toBeLessThanOrEqual(THRESHOLDS.unusedKeys);
    });

    it(`fully unused namespaces does not increase (ratchet: ${THRESHOLDS.unusedNamespaces})`, () => {
      const { usedNamespaces } = scanCodebase();
      const unused = nbNamespaces.filter((ns) => !usedNamespaces.has(ns));
      console.warn(
        `Unused namespaces: ${unused.length} — ${unused.join(', ')} ` +
          `(threshold: ${THRESHOLDS.unusedNamespaces})`
      );
      expect(unused.length).toBeLessThanOrEqual(THRESHOLDS.unusedNamespaces);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Value quality
  // -------------------------------------------------------------------------
  describe('Value quality', () => {
    it('nb.json has no empty string values (strict)', () => {
      const empties = nbEntries.filter(([, v]) => v === '');
      if (empties.length > 0) {
        console.warn(`Empty values in nb.json:\n${empties.map(([k]) => `  ${k}`).join('\n')}`);
      }
      expect(empties.length).toBe(0);
    });

    it('en.json has no empty string values (strict)', () => {
      const empties = enEntries.filter(([, v]) => v === '');
      if (empties.length > 0) {
        console.warn(`Empty values in en.json:\n${empties.map(([k]) => `  ${k}`).join('\n')}`);
      }
      expect(empties.length).toBe(0);
    });

    it('no TODO/FIXME marker values in any locale (strict)', () => {
      const markerRe = /\b(TODO|FIXME|HACK|XXX)\b/i;
      const allLocaleEntries: Array<[string, string, unknown]> = [
        ...nbEntries.map(([k, v]) => ['nb', k, v] as [string, string, unknown]),
        ...enEntries.map(([k, v]) => ['en', k, v] as [string, string, unknown]),
        ...getAllEntries(arObj).map(([k, v]) => ['ar', k, v] as [string, string, unknown]),
      ];
      const markers = allLocaleEntries.filter(
        ([, , v]) => typeof v === 'string' && markerRe.test(v)
      );
      if (markers.length > 0) {
        console.warn(
          `TODO/FIXME values found:\n` +
            markers.map(([loc, k, v]) => `  [${loc}] ${k}: "${v}"`).join('\n')
        );
      }
      expect(markers.length).toBe(0);
    });

    it(`identical nb↔en values does not increase (ratchet: ${THRESHOLDS.identicalNbEn})`, () => {
      const identical: string[] = [];
      for (const [key, val] of nbEntries) {
        if (typeof val !== 'string' || val.length <= 2) continue;
        if (enMap.has(key) && enMap.get(key) === val) {
          identical.push(key);
        }
      }
      console.warn(
        `Identical nb↔en values (len>2): ${identical.length} ` +
          `(threshold: ${THRESHOLDS.identicalNbEn})`
      );
      expect(identical.length).toBeLessThanOrEqual(THRESHOLDS.identicalNbEn);
    });

    it(`highly duplicated nb values does not increase (ratchet: ${THRESHOLDS.highlyDuplicatedValues})`, () => {
      const counts = new Map<string, number>();
      for (const [, val] of nbEntries) {
        if (typeof val !== 'string' || val.length <= 3) continue;
        counts.set(val, (counts.get(val) || 0) + 1);
      }
      const duplicated = [...counts.entries()].filter(([, c]) => c >= 4);
      console.warn(
        `Highly duplicated nb values (4+ uses): ${duplicated.length} ` +
          `(threshold: ${THRESHOLDS.highlyDuplicatedValues})`
      );
      expect(duplicated.length).toBeLessThanOrEqual(THRESHOLDS.highlyDuplicatedValues);
    });
  });
});
