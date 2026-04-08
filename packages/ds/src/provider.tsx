/**
 * React provider for managing Designsystemet theme and styling.
 *
 * This provider handles runtime theme switching by managing <link>
 * elements in the document head. It supports themes with multiple CSS
 * files (base + extensions) and sets data attributes for color scheme,
 * size, and typography preferences.
 *
 * @example
 * ```tsx
 * import { DesignsystemetProvider } from '@digilist-saas/ds';
 *
 * function App() {
 *   return (
 *     <DesignsystemetProvider theme="digdir" colorScheme="auto" size="auto">
 *       <YourApp />
 *     </DesignsystemetProvider>
 *   );
 * }
 * ```
 */
import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_THEME, getThemeUrls, type ThemeId } from './themes';

// =============================================================================
// Theme Transition Overlay
// =============================================================================

const TRANSITION_DURATION = 350; // ms

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--ds-color-neutral-background-default, #f8f9fa)',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 0.15s ease-out',
};

const overlayVisibleStyles: React.CSSProperties = {
  ...overlayStyles,
  opacity: 1,
  pointerEvents: 'auto',
};

const spinnerStyles: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid var(--ds-color-neutral-border-subtle, #e2e8f0)',
  borderTopColor: 'var(--ds-color-accent-base-default, #2A5280)',
  borderRadius: '50%',
  animation: 'ds-theme-spin 0.6s linear infinite',
};

function ThemeTransitionOverlay({ isVisible }: { isVisible: boolean }) {
  return (
    <>
      <style>{`
        @keyframes ds-theme-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={isVisible ? overlayVisibleStyles : overlayStyles}
        aria-hidden="true"
        data-theme-transition-overlay
      >
        <div style={spinnerStyles} />
      </div>
    </>
  );
}

/**
 * Available color scheme options for the design system.
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * Available size modes for component scaling.
 * 'auto' enables viewport-based responsive switching.
 */
export type DsSize = 'sm' | 'md' | 'lg' | 'auto';

/**
 * Available typography presets.
 */
export type Typography = 'primary' | 'secondary';

/**
 * Props for the DesignsystemetProvider component.
 */
export type DesignsystemetProviderProps = {
  /** Child components to be wrapped */
  children: React.ReactNode;
  /** Theme identifier for tenant branding */
  theme?: ThemeId;
  /** Color scheme preference */
  colorScheme?: ColorScheme;
  /** Component size mode */
  size?: DsSize;
  /** Typography preset */
  typography?: Typography;
  /**
   * Element type to render as the wrapper. Defaults to 'div'.
   * Use 'html' or 'body' to set attributes directly on document elements.
   */
  rootAs?: keyof JSX.IntrinsicElements;
  /**
   * Skip dynamic theme CSS loading. Use this when theme CSS is imported
   * directly in the app bundle (recommended for cache-busting).
   * When true, only data attributes are set, no <link> elements created.
   * @default false
   */
  skipThemeLoading?: boolean;
};

const THEME_LINK_DATA_ATTR = 'data-xala-theme-link';

/**
 * Ensures theme CSS link elements exist in the document head.
 *
 * This function creates or updates <link> elements for the theme CSS.
 * It supports multiple CSS files per theme (base + extensions).
 * Old links are removed when switching themes to prevent conflicts.
 *
 * @param hrefs - Array of URLs for theme CSS files
 */
function ensureThemeLinks(hrefs: string[]): void {
  const head = document.head;

  // Remove existing theme links
  head.querySelectorAll(`link[${THEME_LINK_DATA_ATTR}]`).forEach((el) => {
    el.remove();
  });

  // Add new theme links in order (base first, then extensions)
  hrefs.forEach((href, index) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(THEME_LINK_DATA_ATTR, String(index));
    head.appendChild(link);
  });
}

/**
 * React provider component for Designsystemet theming.
 *
 * Manages theme loading through dynamic <link> elements and applies
 * data attributes for styling variations. Theme changes are applied
 * instantly without page reload. Supports themes with multiple CSS
 * files (e.g., CLI-generated base + app extensions).
 *
 * @param props - Provider configuration props
 * @returns JSX element with theme context
 */
export function DesignsystemetProvider({
  children,
  theme = DEFAULT_THEME,
  colorScheme = 'auto',
  size = 'auto',
  typography = 'primary',
  rootAs: Root = 'div',
  skipThemeLoading = false,
}: DesignsystemetProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevColorSchemeRef = useRef(colorScheme);
  const isFirstRender = useRef(true);

  // Handle theme transition overlay
  useEffect(() => {
    // Skip on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevColorSchemeRef.current = colorScheme;
      return;
    }

    // Only show overlay when colorScheme actually changes
    if (prevColorSchemeRef.current !== colorScheme) {
      setIsTransitioning(true);

      // Hide overlay after transition completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_DURATION);

      prevColorSchemeRef.current = colorScheme;
      return () => clearTimeout(timer);
    }
  }, [colorScheme]);

  // Apply theme and attributes
  useEffect(() => {
    // Only load theme CSS dynamically if not bundled
    if (!skipThemeLoading) {
      const urls = getThemeUrls(theme);
      ensureThemeLinks(urls);
    }

    // Always set attributes on html element for CSS targeting
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-size', size);
    document.documentElement.setAttribute('data-typography', typography);
  }, [theme, colorScheme, size, typography, skipThemeLoading]);

  return (
    <Root
      data-color-scheme={colorScheme}
      data-size={size}
      data-typography={typography}
    >
      <ThemeTransitionOverlay isVisible={isTransitioning} />
      {children}
    </Root>
  );
}
