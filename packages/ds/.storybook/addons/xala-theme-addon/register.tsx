/**
 * Xala Theme Addon
 * 
 * Custom Storybook addon that integrates with our theming system.
 * Replaces storybook-dark-mode with better integration and control.
 * 
 * Features:
 * - Integrates with THEME_COLORS from design-system
 * - Supports brand themes (custom, xaheen, digdir)
 * - Supports color schemes (light, dark)
 * - Applies themes to both manager UI and preview iframe
 * - No CSS conflicts - uses Storybook's theming API properly
 */

import { addons } from 'storybook/manager-api';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { create } from 'storybook/theming';
import { THEME_COLORS, type ThemeId } from '../../../src/themes';

// Custom event for color scheme changes
const COLOR_SCHEME_EVENT = 'XALA_COLOR_SCHEME_CHANGED';

type BrandTheme = 'digilist' | 'xaheen' | 'digdir' | 'altinn' | 'brreg' | 'platform';
type ColorScheme = 'light' | 'dark';

// Typography for Storybook themes
const storybookTypography = {
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontCode: '"JetBrains Mono", "Fira Code", monospace',
};

/**
 * Creates a Storybook theme from our theme colors
 */
function createStorybookTheme(
  themeId: ThemeId,
  mode: ColorScheme,
  brandUrl: string = 'https://xala.no'
) {
  // Fallback to digilist if theme doesn't exist (handles legacy 'custom' theme)
  const themeConfig = THEME_COLORS[themeId] || THEME_COLORS.digilist;
  const colors = themeConfig[mode];

  return create({
    base: mode,
    brandTitle: `${themeConfig.name} Design System`,
    brandUrl,
    ...storybookTypography,
    // Primary colors
    colorPrimary: colors.accent.base,
    colorSecondary: colors.accent.base,

    // App backgrounds - CRITICAL: appBg controls sidebar background
    appBg: colors.neutral.background, // Sidebar background
    appContentBg: colors.neutral.surface, // Main content area
    appPreviewBg: colors.neutral.surface, // Preview iframe background

    // Borders and radius
    appBorderColor: colors.neutral.border,
    appBorderRadius: 4,

    // Text colors
    textColor: colors.neutral.text,
    textInverseColor: colors.accent.contrast,
    textMutedColor: colors.neutral.textSubtle,

    // Bar (toolbar/sidebar) - CRITICAL: barBg controls top bar, not sidebar
    barBg: colors.neutral.surface, // Top bar background
    barTextColor: colors.neutral.text, // Top bar text
    barHoverColor: colors.accent.hover, // Hover state
    barSelectedColor: colors.accent.base, // Selected item (sidebar selection)

    // Inputs
    inputBg: colors.neutral.surface,
    inputBorder: colors.neutral.border,
    inputTextColor: colors.neutral.text,
    inputBorderRadius: 4,
  });
}

/**
 * Applies theme to Storybook manager UI with smooth transitions
 */
function applyManagerTheme(themeId: BrandTheme, colorScheme: ColorScheme): void {
  const theme = createStorybookTheme(themeId as ThemeId, colorScheme);

  // Use Storybook's official API - this is the proper way
  addons.setConfig({
    theme,
  });

  // Also set data attributes for CSS targeting
  if (typeof document !== 'undefined') {
    // Add transition class for smooth theme changes
    document.documentElement.classList.add('theme-transitioning');

    // Use requestAnimationFrame to ensure smooth transition
    requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-sb-theme', themeId);
      document.documentElement.setAttribute('data-sb-mode', colorScheme);
      document.documentElement.setAttribute('data-color-scheme', colorScheme);

      // Add/remove dark class for CSS selectors
      if (colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }

      // Remove transition class after a short delay
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
    });
  }
}

/**
 * Get brand theme from URL parameters
 */
function getBrandThemeFromURL(): BrandTheme | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const globalsParam = urlParams.get('globals');

  if (globalsParam) {
    const match = globalsParam.match(/brandTheme:(\w+)/);
    if (match && match[1]) {
      const theme = match[1] as BrandTheme;
      // Validate it's a known theme
      if (['digilist', 'xaheen', 'digdir', 'altinn', 'brreg', 'platform'].includes(theme)) {
        return theme;
      }
    }
  }

  return null;
}

/**
 * Get color scheme from URL parameters
 */
function getColorSchemeFromURL(): ColorScheme | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const globalsParam = urlParams.get('globals');

  if (globalsParam) {
    const match = globalsParam.match(/colorScheme:(light|dark)/);
    if (match && match[1]) {
      return match[1] as ColorScheme;
    }
  }

  return null;
}

/**
 * Get initial theme from globals, URL, or defaults
 */
function getInitialTheme(globals?: Record<string, unknown>): {
  brandTheme: BrandTheme;
  colorScheme: ColorScheme;
} {
  // Try globals first, then URL, then default
  const brandTheme = (globals?.brandTheme as BrandTheme) || getBrandThemeFromURL() || 'digilist';
  const colorScheme = (globals?.colorScheme as ColorScheme) || getColorSchemeFromURL() || 'light';

  return { brandTheme, colorScheme };
}

// Debounce function to prevent flickering
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Track last applied theme to prevent unnecessary updates
let lastAppliedTheme: { brandTheme: BrandTheme; colorScheme: ColorScheme } | null = null;

// Register the addon
addons.register('xala-theme-addon', (api) => {
  const channel = api.getChannel();

  // Debounced theme application to prevent flickering
  const debouncedApplyTheme = debounce((brandTheme: BrandTheme, colorScheme: ColorScheme) => {
    // Skip if same theme already applied
    if (
      lastAppliedTheme?.brandTheme === brandTheme &&
      lastAppliedTheme?.colorScheme === colorScheme
    ) {
      return;
    }

    applyManagerTheme(brandTheme, colorScheme);
    lastAppliedTheme = { brandTheme, colorScheme };
  }, 50); // 50ms debounce

  // Apply initial theme (no debounce for initial load)
  if (typeof window !== 'undefined') {
    const applyInitial = () => {
      const { brandTheme, colorScheme } = getInitialTheme();
      applyManagerTheme(brandTheme, colorScheme);
      lastAppliedTheme = { brandTheme, colorScheme };
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', applyInitial);
    } else {
      applyInitial();
    }

  }

  // Listen for global updates (theme changes, color scheme toggles, etc.)
  if (channel) {
    channel.on(GLOBALS_UPDATED, ({ globals }) => {
      const brandTheme = (globals?.brandTheme as BrandTheme) || 'digilist';
      const colorScheme = (globals?.colorScheme as ColorScheme) || 'light';

      debouncedApplyTheme(brandTheme, colorScheme);
    });

    // Listen for our custom color scheme event (from preview)
    channel.on(COLOR_SCHEME_EVENT, (colorScheme: ColorScheme) => {
      const currentGlobals = api.getGlobals();
      const brandTheme = (currentGlobals?.brandTheme as BrandTheme) || 'digilist';
      debouncedApplyTheme(brandTheme, colorScheme);
    });
  }
});
