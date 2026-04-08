/**
 * Architecture Contract ESLint Rules
 *
 * These rules enforce the DigilistSaaS Architecture Contracts:
 * - APP_ARCHITECTURE_CONTRACT.md
 * - UI_GUARDRAILS_CONTRACT.md (including RTL + Localization)
 *
 * Active Rules:
 * - sdk-usage-contract: Enforce @digilist-saas/sdk namespace restrictions per app
 * - no-domain-ui-in-backoffice: Prevent domain UI in backoffice
 * - no-direct-digdir: Prevent direct Digdir/UI kit imports — use @digilist-saas/ds
 * - no-hardcoded-strings: Prevent hardcoded user-facing strings — use t()
 * - no-hardcoded-colors: Prevent rgb/rgba/hex — use design tokens
 * - no-inline-svg: Prevent inline SVG — use @digilist-saas/ds Icon components
 * - no-raw-html: Prevent raw HTML elements — use DS components
 * - require-css-modules: Enforce .module.css over plain .css
 * - no-deprecated-spacing: Prevent --ds-spacing-* / --digilist-spacing-* tokens
 * - no-hardcoded-pixels: Prefer design tokens over hardcoded px values
 *
 * Retired:
 * - no-css-in-apps: Superseded by require-css-modules (allows .module.css)
 */

export { default as sdkUsageContract } from './sdk-usage-contract.js';
export { default as noDomainUiInBackoffice } from './no-domain-ui-in-backoffice.js';
export { default as noDirectDigdir } from './no-direct-digdir.js';
export { default as noHardcodedStrings } from './no-hardcoded-strings.js';
export { default as noHardcodedColors } from './no-hardcoded-colors.js';
export { default as noInlineSvg } from './no-inline-svg.js';
export { default as noRawHtml } from './no-raw-html.js';
export { default as requireCssModules } from './require-css-modules.js';
export { default as noDeprecatedSpacing } from './no-deprecated-spacing.js';
export { default as noHardcodedPixels } from './no-hardcoded-pixels.js';
