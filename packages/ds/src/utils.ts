/**
 * Utility functions and design tokens for the design system
 */

/**
 * Merge class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// =============================================================================
// Design System Tokens - Enhanced spacing and styling
// =============================================================================

/**
 * Enhanced spacing values using design tokens
 * These map to Digdir spacing scale for consistent sizing
 */
export const spacing = {
  xs: 'var(--ds-size-1)',
  sm: 'var(--ds-size-2)',
  md: 'var(--ds-size-3)',
  lg: 'var(--ds-size-4)',
  xl: 'var(--ds-size-5)',
  '2xl': 'var(--ds-size-6)',
  '3xl': 'var(--ds-size-8)',
  '4xl': 'var(--ds-size-12)',
} as const;

/**
 * Interactive element backgrounds using design tokens
 */
export const interactiveBackgrounds = {
  hover: 'var(--ds-color-neutral-surface-hover)',
  active: 'var(--ds-color-neutral-surface-active)',
  selected: 'var(--ds-color-accent-surface-default)',
  // For dark mode - tokens automatically adapt
  hoverDark: 'var(--ds-color-neutral-surface-hover)',
  activeDark: 'var(--ds-color-neutral-surface-active)',
  selectedDark: 'var(--ds-color-accent-surface-default)',
} as const;

/**
 * Badge/Tag styling presets using design tokens
 */
export const badgeStyles = {
  meta: {
    padding: 'var(--ds-size-1) var(--ds-size-3)',
    fontSize: 'var(--ds-font-size-xs)',
    fontWeight: 'var(--ds-font-weight-medium)',
    borderRadius: 'var(--ds-border-radius-full)',
  },
  shortcut: {
    padding: 'var(--ds-size-1) var(--ds-size-2)',
    fontSize: 'var(--ds-font-size-xs)',
    fontWeight: 'var(--ds-font-weight-medium)',
    borderRadius: 'var(--ds-border-radius-sm)',
  },
  notification: {
    padding: '0 var(--ds-size-1)',
    fontSize: 'var(--ds-font-size-xs)',
    fontWeight: 'var(--ds-font-weight-bold)',
    borderRadius: 'var(--ds-border-radius-full)',
    minWidth: 'var(--ds-size-5)',
    height: 'var(--ds-size-5)',
  },
} as const;

/**
 * Dropdown/Menu item styling using design tokens
 */
export const menuItemStyles = {
  padding: 'var(--ds-size-3) var(--ds-size-5)',
  gap: 'var(--ds-size-4)',
  marginX: 'var(--ds-size-2)',
  borderRadius: 'var(--ds-border-radius-md)',
  transition: 'all 0.1s ease',
} as const;

/**
 * Empty state styling using design tokens
 */
export const emptyStateStyles = {
  padding: 'var(--ds-size-12) var(--ds-size-8)',
  gap: 'var(--ds-size-4)',
} as const;

/**
 * Button text colors using design tokens for proper contrast
 */
export const buttonTextColors = {
  success: 'var(--ds-color-success-contrast-default)',
  accent: 'var(--ds-color-accent-contrast-default)',
  danger: 'var(--ds-color-danger-contrast-default)',
  warning: 'var(--ds-color-warning-contrast-default)',
} as const;

/**
 * Logo text styling using design tokens
 */
export const logoStyles = {
  title: {
    fontSize: 'var(--ds-font-size-xl)',
    fontWeight: 'var(--ds-font-weight-bold)',
    lineHeight: 'var(--ds-line-height-tight, 1.1)',
    letterSpacing: 'var(--ds-letter-spacing-tight, 0.02em)',
  },
  subtitle: {
    fontSize: 'var(--ds-font-size-md)',
    fontWeight: 'var(--ds-font-weight-medium)',
    lineHeight: 'var(--ds-line-height-snug, 1.2)',
    opacity: 0.55,
    letterSpacing: 'var(--ds-letter-spacing-wide, 0.06em)',
    textTransform: 'uppercase' as const,
  },
  gap: 'var(--ds-size-4)',
} as const;

// =============================================================================
// Brand Colors - DIGILIST
// =============================================================================

/**
 * Brand color palette
 * Use CSS custom properties: var(--brand-navy), var(--brand-blue), etc.
 */
export const brandColors = {
  navy: {
    hex: '#1F2F6E',
    oklch: 'oklch(0.28 0.09 264)',
    usage: 'Core trust color',
  },
  blue: {
    hex: '#2F55A4',
    oklch: 'oklch(0.45 0.12 262)',
    usage: 'Primary interaction',
  },
  aqua: {
    hex: '#9EDBE5',
    oklch: 'oklch(0.82 0.08 205)',
    usage: 'Availability/calm',
  },
  ice: {
    hex: '#D6F3F6',
    oklch: 'oklch(0.94 0.03 205)',
    usage: 'Surfaces/backgrounds',
  },
  green: {
    hex: '#8BC34A',
    oklch: 'oklch(0.72 0.14 130)',
    usage: 'Location/success',
  },
  white: {
    hex: '#FFFFFF',
    oklch: 'oklch(1.0 0 0)',
    usage: 'Contrast',
  },
  charcoal: {
    hex: '#0F172A',
    oklch: 'oklch(0.15 0.02 264)',
    usage: 'Text/dark UI',
  },
} as const;

/**
 * CSS custom properties for brand colors
 * Add to :root in your CSS
 */
export const brandColorsCss = `
:root {
  --brand-navy: #1F2F6E;
  --brand-blue: #2F55A4;
  --brand-aqua: #9EDBE5;
  --brand-ice: #D6F3F6;
  --brand-green: #8BC34A;
  --brand-white: #FFFFFF;
  --brand-charcoal: #0F172A;
}
` as const;
