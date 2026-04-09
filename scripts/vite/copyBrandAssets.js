/**
 * Vite plugin: copy Digilist logo from @digipicks/shared to app public/.
 * One asset (logo.svg) used for header, favicon, and PWA icon.
 */
import path from 'path';
import fs from 'fs';
export function copyBrandAssets(options) {
  var appRoot = options.appRoot;
  var sourceDir = path.resolve(appRoot, '../../packages/shared/logo');
  var destDir = path.resolve(appRoot, 'public');
  var logoPath = path.join(sourceDir, 'logo.svg');
  return {
    name: 'copy-brand-assets',
    buildStart: function () {
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
