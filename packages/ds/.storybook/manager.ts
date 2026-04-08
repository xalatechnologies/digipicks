/**
 * Storybook Manager Configuration
 * 
 * Applies theme to Storybook's manager UI (sidebar, toolbar, etc.)
 * using our design system's theme CSS and design tokens.
 * 
 * Philosophy: Treat Storybook like any other web app - use DesignsystemetProvider
 * approach with design tokens, no custom CSS or raw color values.
 */
import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';

// Theme colors - single source of truth
// NOTE: Can't use getThemeCSS() here - ?raw imports don't work in manager build
import { THEME_COLORS, type ThemeId } from '../src/themes';

// Custom event for color scheme changes
const COLOR_SCHEME_EVENT = 'XALA_COLOR_SCHEME_CHANGED';

type BrandTheme = 'digilist' | 'xaheen' | 'digdir' | 'altinn' | 'brreg' | 'platform';
type ColorScheme = 'light' | 'dark';

// =============================================================================
// THEME CSS INJECTION - Just like DesignsystemetProvider
// =============================================================================

const MANAGER_THEME_STYLE_ID = 'xala-manager-theme';

// CSS cache to avoid re-fetching
const cssCache = new Map<string, string>();

/**
 * Fetch theme CSS from public folder (manager can't use ?raw imports)
 */
async function fetchThemeCSS(themeId: ThemeId): Promise<string> {
  const cacheKey = themeId;
  if (cssCache.has(cacheKey)) {
    return cssCache.get(cacheKey)!;
  }

  try {
    // Map theme to CSS files
    let files: string[] = [];
    switch (themeId) {
      case 'digilist':
        files = ['/themes/xala.css', '/themes/common-extensions.css', '/themes/digilist-colors.css'];
        break;
      case 'xaheen':
        files = ['/themes/xala.css', '/themes/common-extensions.css', '/themes/xaheen-colors.css'];
        break;
      case 'platform':
        files = ['/themes/xala.css', '/themes/common-extensions.css', '/themes/platform-colors.css'];
        break;
      case 'digdir':
      case 'altinn':
      case 'brreg':
        // Use base Designsystemet + common extensions
        files = ['/themes/xala.css', '/themes/common-extensions.css'];
        break;
      default:
        files = ['/themes/xala.css', '/themes/common-extensions.css', '/themes/digilist-colors.css'];
    }

    // Fetch all CSS files
    const responses = await Promise.all(files.map(f => fetch(f)));
    const cssContents = await Promise.all(responses.map(r => r.text()));
    const combined = cssContents.join('\n');

    cssCache.set(cacheKey, combined);
    return combined;
  } catch (error) {
    console.error('[Manager Theme] Failed to fetch theme CSS:', error);
    return '';
  }
}

/**
 * Inject theme CSS into manager frame (fetch from public folder)
 */
async function injectManagerThemeCSS(themeId: ThemeId, colorScheme: ColorScheme): Promise<void> {
  if (typeof document === 'undefined') return;

  console.log(`[Manager Theme] Injecting theme: ${themeId}, colorScheme: ${colorScheme}`);

  // Remove existing theme style
  const existingStyle = document.getElementById(MANAGER_THEME_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Fetch theme CSS from public folder
  const css = await fetchThemeCSS(themeId);
  console.log(`[Manager Theme] CSS length: ${css?.length || 0} characters`);

  if (css && css.length > 0) {
    const style = document.createElement('style');
    style.id = MANAGER_THEME_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
    console.log('[Manager Theme] ✅ Theme CSS injected successfully');
  } else {
    console.log('[Manager Theme] Using base Designsystemet theme (no custom CSS needed)');
  }

  // Set data attributes for CSS targeting
  document.documentElement.setAttribute('data-color-scheme', colorScheme);
  document.documentElement.setAttribute('data-size', 'md');
  document.documentElement.setAttribute('data-typography', 'primary');

  // Set class for CSS selectors
  if (colorScheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }

  console.log('[Manager Theme] ✅ Data attributes set:', {
    colorScheme: document.documentElement.getAttribute('data-color-scheme'),
    themeClass: colorScheme === 'dark' ? 'dark' : 'light'
  });
}

/**
 * CSS that maps Storybook UI elements to design tokens
 * No hardcoded colors - only design token references!
 */
const storybookUIMapping = `
  /* Apply design system font */
  body, * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  /* ==========================================================================
   * SIDEBAR - Use design tokens
   * ========================================================================== */
  aside,
  nav,
  [class*="sidebar"],
  [class*="Sidebar"] {
    background-color: var(--ds-color-neutral-background-default) !important;
    color: var(--ds-color-neutral-text-default) !important;
  }
  
  aside button,
  aside a,
  nav button,
  nav a,
  [class*="sidebar"] button,
  [class*="sidebar"] a {
    color: var(--ds-color-neutral-text-default) !important;
  }
  
  aside button:hover,
  aside a:hover,
  nav button:hover,
  nav a:hover {
    background-color: var(--ds-color-neutral-surface-hover) !important;
  }
  
  /* Selected sidebar items - use accent color with proper contrast */
  aside [data-selected="true"],
  nav [data-selected="true"],
  [class*="sidebar"] [data-selected="true"],
  [data-selected="true"],
  [aria-current="true"],
  [aria-current="page"] {
    background-color: var(--ds-color-accent-base-default) !important;
    color: var(--ds-color-accent-base-contrast-default) !important;
  }
  
  /* Selected item children and icons */
  aside [data-selected="true"] *,
  nav [data-selected="true"] *,
  [data-selected="true"] *,
  [aria-current="true"] *,
  [aria-current="page"] * {
    color: var(--ds-color-accent-base-contrast-default) !important;
  }
  
  aside [data-selected="true"] svg,
  nav [data-selected="true"] svg,
  [data-selected="true"] svg,
  [data-selected="true"] svg path {
    fill: var(--ds-color-accent-base-contrast-default) !important;
    color: var(--ds-color-accent-base-contrast-default) !important;
  }
  
  /* ==========================================================================
   * TOP BAR / HEADER - Use design tokens
   * ========================================================================== */
  [role="banner"],
  header,
  [class*="header"],
  [class*="toolbar"],
  [class*="Toolbar"] {
    background-color: var(--ds-color-neutral-surface-default) !important;
    border-bottom-color: var(--ds-color-neutral-border-default) !important;
    color: var(--ds-color-neutral-text-default) !important;
  }
  
  [role="banner"] *,
  [role="banner"] button,
  [role="banner"] svg {
    color: var(--ds-color-neutral-text-default) !important;
  }
  
  /* ==========================================================================
   * BORDERS AND DIVIDERS - Use design tokens
   * ========================================================================== */
  hr,
  [role="separator"] {
    border-color: var(--ds-color-neutral-border-default) !important;
    background-color: var(--ds-color-neutral-border-default) !important;
  }
  
  /* ==========================================================================
   * SMOOTH TRANSITIONS - Design system style
   * ========================================================================== */
  * {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
  }
`;

/**
 * Inject UI mapping CSS once (uses design tokens, not hardcoded colors)
 */
function injectUIMapping(): void {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById('storybook-ui-mapping');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'storybook-ui-mapping';
    styleEl.textContent = storybookUIMapping;
    document.head.appendChild(styleEl);
  }
}

// =============================================================================
// STORYBOOK THEME CONFIG
// =============================================================================

/**
 * Typography configuration
 */
const storybookTypography = {
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontCode: '"JetBrains Mono", "Fira Code", monospace',
};

/**
 * Creates Storybook theme from our THEME_COLORS
 */
function createStorybookTheme(themeId: ThemeId, colorScheme: ColorScheme) {
  // Fallback to digilist if theme doesn't exist (handles legacy 'custom' theme)
  const themeConfig = THEME_COLORS[themeId] || THEME_COLORS.digilist;
  const colors = themeConfig[colorScheme];

  return create({
    base: colorScheme,
    brandTitle: `${themeConfig.name} Design System`,
    brandUrl: 'https://xala.no',
    ...storybookTypography,

    colorPrimary: colors.accent.base,
    colorSecondary: colors.accent.base,

    appBg: colors.neutral.background,
    appContentBg: colors.neutral.surface,
    appPreviewBg: colors.neutral.surface,
    appBorderColor: colors.neutral.border,
    appBorderRadius: 4,

    textColor: colors.neutral.text,
    textInverseColor: colors.accent.contrast,
    textMutedColor: colors.neutral.textSubtle,

    barBg: colors.neutral.surface,
    barTextColor: colors.neutral.text,
    barSelectedColor: colors.accent.base,
    barHoverColor: colors.accent.hover,

    inputBg: colors.neutral.surface,
    inputBorder: colors.neutral.border,
    inputTextColor: colors.neutral.text,
    inputBorderRadius: 4,
  });
}

// =============================================================================
// URL PARAMETER HELPERS
// =============================================================================

function getInitialBrandTheme(): BrandTheme {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const globalsParam = urlParams.get('globals');

    if (globalsParam) {
      const match = globalsParam.match(/brandTheme:(\w+)/);
      if (match && match[1]) {
        const theme = match[1] as BrandTheme;
        if (['digilist', 'xaheen', 'digdir', 'altinn', 'brreg', 'platform'].includes(theme)) {
          return theme;
        }
      }
    }
  }

  return 'digilist';
}

function getInitialColorScheme(): ColorScheme {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const globalsParam = urlParams.get('globals');

    if (globalsParam) {
      const match = globalsParam.match(/colorScheme:(light|dark)/);
      if (match && match[1]) {
        return match[1] as ColorScheme;
      }
    }
  }

  return 'light';
}

// =============================================================================
// THEME APPLICATION
// =============================================================================

/**
 * Apply theme to manager UI
 * Simple approach: inject theme CSS + update Storybook config
 */
async function applyManagerTheme(brandTheme: BrandTheme, colorScheme: ColorScheme): Promise<void> {
  // 1. Inject theme CSS (fetch from public folder)
  await injectManagerThemeCSS(brandTheme as ThemeId, colorScheme);

  // 2. Inject UI mapping CSS (maps Storybook UI to design tokens)
  injectUIMapping();

  // 3. Update Storybook's theme config
  const theme = createStorybookTheme(brandTheme as ThemeId, colorScheme);
  addons.setConfig({ theme });
}

// Debounce to prevent flickering
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

const debouncedApplyTheme = debounce((brandTheme: BrandTheme, colorScheme: ColorScheme) => {
  applyManagerTheme(brandTheme, colorScheme);
}, 50);

// =============================================================================
// INITIAL CONFIG
// =============================================================================

// Get initial theme from URL
const initialThemeId = getInitialBrandTheme();
const initialColorScheme = getInitialColorScheme();
const initialTheme = createStorybookTheme(initialThemeId as ThemeId, initialColorScheme);

// Set initial Storybook config
addons.setConfig({
  theme: initialTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
});

// Apply initial theme CSS
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      applyManagerTheme(initialThemeId, initialColorScheme);
    });
  } else {
    applyManagerTheme(initialThemeId, initialColorScheme);
  }
}

// =============================================================================
// DYNAMIC THEME SWITCHING
// =============================================================================

addons.register('xala-theme-manager', (api) => {
  const channel = api.getChannel();

  console.log('[Manager Theme] Registering theme manager addon');

  if (channel) {
    // Listen for globals updates (brand theme or color scheme changes)
    channel.on(GLOBALS_UPDATED, ({ globals }) => {
      const brandTheme = (globals?.brandTheme as BrandTheme) || 'digilist';
      const colorScheme = (globals?.colorScheme as ColorScheme) || 'light';

      console.log('[Manager Theme] GLOBALS_UPDATED received:', { brandTheme, colorScheme });
      debouncedApplyTheme(brandTheme, colorScheme);
    });

    // Listen for color scheme changes from preview
    channel.on(COLOR_SCHEME_EVENT, (colorScheme: ColorScheme) => {
      const currentGlobals = api.getGlobals();
      const brandTheme = (currentGlobals?.brandTheme as BrandTheme) || 'digilist';

      console.log('[Manager Theme] COLOR_SCHEME_EVENT received:', { brandTheme, colorScheme });
      debouncedApplyTheme(brandTheme, colorScheme);
    });

    console.log('[Manager Theme] Event listeners registered successfully');
  } else {
    console.error('[Manager Theme] Channel not available');
  }
});
