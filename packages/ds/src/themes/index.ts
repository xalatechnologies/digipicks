/**
 * Theme registry for runtime tenant branding switching.
 *
 * This module provides theme URLs that allow applications to swap themes
 * by loading CSS files. Themes can be a single file or an array of files
 * (base + extensions). This approach respects Designsystemet's requirement
 * that theme CSS should only be loaded once per application.
 *
 * @example
 * ```typescript
 * import { THEMES, DEFAULT_THEME, getThemeUrls } from '@digipicks/ds';
 *
 * // Get theme URLs (always returns array)
 * const urls = getThemeUrls(DEFAULT_THEME);
 * ```
 */

// Official Designsystemet themes — paths for app public folder.
// Require copying CSS from @digdir/designsystemet-css if used.
const OFFICIAL_THEMES = {
  digdir: '/themes/digdir.css',
  altinn: '/themes/altinn.css',
  uutilsynet: '/themes/uutilsynet.css',
  portal: '/themes/portal.css',
};

// Shared extensions (spacing, typography, layout, mobile responsive — common to all custom themes)
const COMMON_EXTENSIONS = '/themes/common-extensions.css';

// Native Digdir tokens (sizes, typography, colors) — copied from @digdir/designsystemet-css at deploy time
const DIGDIR_TOKENS = '/themes/digdir-tokens.css';

// Custom DIGILIST theme: base tokens + common extensions + digilist color scheme
const DIGILIST_THEME = [DIGDIR_TOKENS, COMMON_EXTENSIONS, '/themes/digilist-theme.css'];

// Xala Navy theme: base tokens + common extensions + navy color scheme
const XALA_NAVY_THEME = [DIGDIR_TOKENS, COMMON_EXTENSIONS, '/themes/xala-navy-theme.css'];

// Steinkjer theme: pastell editorial palette
const STEINKJER_THEME = [DIGDIR_TOKENS, COMMON_EXTENSIONS, '/themes/steinkjer-theme.css'];

// Hamar theme: dark-dominant minimal palette
const HAMAR_THEME = [DIGDIR_TOKENS, COMMON_EXTENSIONS, '/themes/hamar-theme.css'];

// EdgePicks theme: obsidian dark-first — "The Elite Perspective"
const EDGEPICKS_THEME = [DIGDIR_TOKENS, COMMON_EXTENSIONS, '/themes/edgepicks-theme.css'];

export type ThemeId =
  | 'digdir'
  | 'altinn'
  | 'uutilsynet'
  | 'portal'
  | 'digilist'
  | 'xala-navy'
  | 'steinkjer'
  | 'hamar'
  | 'edgepicks';

/**
 * Theme CSS files. Can be single file (string) or multiple files (array).
 * Multiple files are loaded in order: base theme first, then extensions.
 */
export const THEMES: Record<ThemeId, string | string[]> = {
  digdir: OFFICIAL_THEMES.digdir,
  altinn: OFFICIAL_THEMES.altinn,
  uutilsynet: OFFICIAL_THEMES.uutilsynet,
  portal: OFFICIAL_THEMES.portal,
  digilist: DIGILIST_THEME,
  'xala-navy': XALA_NAVY_THEME,
  steinkjer: STEINKJER_THEME,
  hamar: HAMAR_THEME,
  edgepicks: EDGEPICKS_THEME,
};

/**
 * Get theme URLs as an array (for consistent handling).
 */
export function getThemeUrls(themeId: ThemeId): string[] {
  const theme = THEMES[themeId];
  return Array.isArray(theme) ? theme : [theme];
}

// Xala Navy is the default theme
export const DEFAULT_THEME: ThemeId = 'xala-navy';
