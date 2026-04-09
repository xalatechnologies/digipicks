/**
 * SkipLinks Component
 *
 * Provides skip navigation links for keyboard users to bypass repetitive content.
 * WCAG 2.4.1 Bypass Blocks (Level A)
 *
 * Features:
 * - Hidden until focused (keyboard navigation)
 * - Jumps to main content, skipping header navigation
 * - Uses design tokens for styling
 * - Accessible with proper focus indicators
 *
 * @example
 * ```tsx
 * import { SkipLinks } from '@digipicks/ds';
 *
 * function App() {
 *   return (
 *     <>
 *       <SkipLinks />
 *       <Header id="main-navigation">...</Header>
 *       <main id="main-content">...</main>
 *     </>
 *   );
 * }
 * ```
 */

import * as React from 'react';
import styles from './SkipLinks.module.css';
import { cn } from '../utils';

export interface SkipLink {
  /** Target element ID (without #) */
  target: string;
  /** Link label text */
  label: string;
}

export interface SkipLinksProps {
  /** Custom skip links (defaults to main-content and main-navigation) */
  links?: SkipLink[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when skip link is used (for accessibility analytics) */
  onSkipLinkClick?: (target: string) => void;
}

const DEFAULT_LINKS: SkipLink[] = [
  { target: 'main-content', label: 'Hopp til hovedinnhold' },
  { target: 'main-navigation', label: 'Hopp til navigasjon' },
];

/**
 * SkipLinks Component
 *
 * SSR-safe accessibility component for keyboard navigation
 */
export function SkipLinks({
  links = DEFAULT_LINKS,
  className,
  onSkipLinkClick,
}: SkipLinksProps = {}): React.ReactElement {
  const handleClick = (target: string) => {
    onSkipLinkClick?.(target);
  };

  return (
    <div className={cn(styles.skipLinks, className)}>
      {links.map((link) => (
        <a
          key={link.target}
          href={`#${link.target}`}
          className={styles.skipLink}
          onClick={() => handleClick(link.target)}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default SkipLinks;
