#!/usr/bin/env node
/** Copies shared logo to app public/ - use from app directory: node ../../scripts/copy-logo.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.cwd();
const source = path.resolve(__dirname, '../packages/shared/logo/logo.svg');
const destDir = path.join(appRoot, 'public');
const dest = path.join(destDir, 'logo.svg');

if (!fs.existsSync(source)) {
  console.warn('[copy-logo] Source not found:', source);
  process.exit(0);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log('[copy-logo] Copied logo.svg to public/');
