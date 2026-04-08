/**
 * Accessibility Components
 *
 * Exports for WCAG-compliant accessibility primitives.
 * Import `@digilist-saas/ds/accessibility` in app entry to enable global a11y styles.
 */

// Global WCAG 2.1 AA styles — focus rings, sr-only, reduced motion, etc.
import './wcag-global.css';

export { SkipLinks, type SkipLinksProps, type SkipLink } from './SkipLinks';
export { LiveAnnouncer, useLiveAnnouncer } from './LiveAnnouncer';
