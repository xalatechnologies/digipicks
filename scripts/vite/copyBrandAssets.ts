/**
 * Vite plugin: copy Digilist logo from @digilist-saas/shared to app public/.
 * One asset (logo.svg) used for header, favicon, and PWA icon.
 */

import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

export interface CopyBrandAssetsOptions {
  /** App root directory (e.g. __dirname when called from vite.config.ts) */
  appRoot: string;
}

export function copyBrandAssets(options: CopyBrandAssetsOptions): Plugin {
  const { appRoot } = options;
  const sourceDir = path.resolve(appRoot, '../../packages/shared/logo');
  const destDir = path.resolve(appRoot, 'public');
  const logoPath = path.join(sourceDir, 'logo.svg');

  return {
    name: 'copy-brand-assets',
    buildStart() {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      if (fs.existsSync(logoPath)) {
        fs.copyFileSync(logoPath, path.join(destDir, 'logo.svg'));
        console.log('[copy-brand-assets] Copied logo.svg to public/');
      }
    },
  };
}
