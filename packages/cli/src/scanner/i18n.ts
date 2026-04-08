/**
 * i18n scanner — reads locale files and checks for namespace conflicts.
 */

import * as fs from 'node:fs';
import { PATHS } from '../lib/constants.js';

export interface I18nScanResult {
  namespaces: Set<string>;
  nbKeys: Record<string, unknown>;
  enKeys: Record<string, unknown>;
}

/**
 * Scan locale files for existing namespaces and keys.
 */
export function scanI18n(): I18nScanResult {
  const nbKeys = readJsonSafe(PATHS.nbJson);
  const enKeys = readJsonSafe(PATHS.enJson);
  const namespaces = new Set(Object.keys(nbKeys));
  return { namespaces, nbKeys, enKeys };
}

/**
 * Check if a namespace already exists in locale files.
 */
export function hasNamespaceConflict(namespace: string): boolean {
  const { namespaces } = scanI18n();
  return namespaces.has(namespace);
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}
