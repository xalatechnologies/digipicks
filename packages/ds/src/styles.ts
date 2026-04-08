/**
 * Designsystemet CSS import.
 * 
 * This is the ONLY place in the monorepo that imports Designsystemet CSS.
 * All other imports should go through the @digilist-saas/ds facade to ensure
 * consistent styling and prevent duplicate CSS loading.
 * 
 * @example
 * ```typescript
 * import '@digilist-saas/ds/styles'; // Do this once in your application's entry point
 * ```
 */
import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

// Responsive breakpoints and auto data-size switching
import './responsive/breakpoints.css';
import './responsive/responsive.css';

/**
 * Theme Loading Strategy:
 * 
 * We do NOT import a theme here to allow tenant runtime switching via a <link> tag.
 * Theme CSS URLs are provided by @digilist-saas/ds-themes, which enables dynamic theme
 * changes without page reloads or CSS conflicts.
 */
export { }; // keep this as a module
