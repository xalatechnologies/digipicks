import type { Preview, Decorator } from '@storybook/react-vite';
import { INITIAL_VIEWPORTS, MINIMAL_VIEWPORTS } from 'storybook/viewport';
import React, { useEffect, useState } from 'react';
import { I18nProvider, useT } from '@digilist-saas/i18n';
import { DocsContainer } from '@storybook/addon-docs/blocks';
import { create } from 'storybook/theming';
import { addons } from 'storybook/preview-api';

// Theme colors - single source of truth for all theme values
import {
  THEME_COLORS,
  getThemeCSS,
  type ThemeId,
} from '../src/themes';

// All styling (fonts, designsystemet-css, theme) is loaded via:
// 1. .storybook/public/vendor/designsystemet.css (loaded in preview-head.html)
// 2. DesignsystemetProvider (injects theme dynamically)
// No need to import dist/styles.js in Storybook - it's only for production builds

import { StoryProvider } from '../src/StoryProvider';

// Suppress React 18 act() warnings and WebSocket HMR noise
const originalError = console.error;
const originalWarn = console.warn;

const shouldSuppressMessage = (message: unknown): boolean => {
  if (typeof message !== 'string') return false;
  const suppressPatterns = [
    'Warning: The current testing environment is not configured to support act',
    'WebSocket is already in CLOSING or CLOSED state',
    'WebSocket connection',
    'WebSocket error',
    'Warning: validateDOMNesting',
    'Warning: <Card />',
    'Warning: The tag <Card>',
    'Warning: <Card.Block />',
    'Warning: The tag <Card.Block>',
    'Warning: React does not recognize the `asChild` prop',
    'An update to ZoomElement inside a test was not wrapped in act',
    'manager  received',
  ];
  return suppressPatterns.some(pattern => message.includes(pattern));
};

console.error = (...args) => {
  if (shouldSuppressMessage(args[0])) return;
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (shouldSuppressMessage(args[0])) return;
  originalWarn.call(console, ...args);
};

// Get channel for global events
const channel = addons.getChannel();

// Custom event name for our color scheme changes
const COLOR_SCHEME_EVENT = 'XALA_COLOR_SCHEME_CHANGED';

// =============================================================================
// STORYBOOK THEMES - Generated from @packages/design-system/src/themes
// =============================================================================

// Typography for Storybook themes
const storybookTypography = {
  fontBase: 'Inter, system-ui, sans-serif',
  fontCode: '"JetBrains Mono", monospace',
};

/**
 * Creates a Storybook theme from the theme colors.
 * This ensures consistency between CSS themes and Storybook UI.
 * Includes all theme properties for comprehensive theming of UI and docs.
 */
function createStorybookTheme(
  themeId: ThemeId,
  mode: 'light' | 'dark',
  brandUrl: string
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

    // App backgrounds
    appBg: colors.neutral.background,
    appContentBg: colors.neutral.surface,
    appPreviewBg: colors.neutral.surface,

    // Borders and radius
    appBorderColor: colors.neutral.border,
    appBorderRadius: 4,

    // Text colors
    textColor: colors.neutral.text,
    textInverseColor: colors.accent.contrast,
    textMutedColor: colors.neutral.textSubtle,

    // Bar (toolbar/sidebar)
    barBg: colors.neutral.surface,
    barTextColor: colors.neutral.text,
    barHoverColor: colors.accent.hover,
    barSelectedColor: colors.accent.base,

    // Inputs
    inputBg: colors.neutral.surface,
    inputBorder: colors.neutral.border,
    inputTextColor: colors.neutral.text,
    inputBorderRadius: 4,

  });
}

// Generate all theme variants from THEME_COLORS
const digilistLightTheme = createStorybookTheme('digilist', 'light', 'https://xala.no');
const digilistDarkTheme = createStorybookTheme('digilist', 'dark', 'https://xala.no');
const xaheenLightTheme = createStorybookTheme('xaheen', 'light', 'https://xala.no');
const xaheenDarkTheme = createStorybookTheme('xaheen', 'dark', 'https://xala.no');
const digdirLightTheme = createStorybookTheme('digdir', 'light', 'https://designsystemet.no');
const digdirDarkTheme = createStorybookTheme('digdir', 'dark', 'https://designsystemet.no');
const platformLightTheme = createStorybookTheme('platform', 'light', 'https://xala.no');
const platformDarkTheme = createStorybookTheme('platform', 'dark', 'https://xala.no');

// Theme registry for easy lookup - maps Storybook global to theme
type BrandTheme = 'digilist' | 'xaheen' | 'digdir' | 'altinn' | 'brreg' | 'platform';
const themeRegistry: Record<BrandTheme, { light: ReturnType<typeof create>; dark: ReturnType<typeof create> }> = {
  digilist: { light: digilistLightTheme, dark: digilistDarkTheme },
  xaheen: { light: xaheenLightTheme, dark: xaheenDarkTheme },
  digdir: { light: digdirLightTheme, dark: digdirDarkTheme },
  altinn: { light: digdirLightTheme, dark: digdirDarkTheme },
  brreg: { light: digdirLightTheme, dark: digdirDarkTheme },
  platform: { light: platformLightTheme, dark: platformDarkTheme },
};

// Track current brand theme for docs container (updated by decorator)
let currentBrandTheme: BrandTheme = 'digilist';

/**
 * Custom hook to get color scheme from globals - reads from URL params!
 */
function useColorScheme() {
  // Read from URL params as initial value
  const getInitialColorScheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const params = new URLSearchParams(window.location.search);
    const globalsParam = params.get('globals');
    if (globalsParam?.includes('colorScheme:dark')) return 'dark';
    if (globalsParam?.includes('colorScheme:light')) return 'light';
    return 'light';
  };

  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(getInitialColorScheme);

  useEffect(() => {
    console.log('[useColorScheme] Hook initialized with:', colorScheme);

    // Listen for globals updates
    const handleGlobalsUpdate = (args: { globals?: { colorScheme?: string } }) => {
      const newScheme = (args.globals?.colorScheme as 'light' | 'dark') || 'light';
      console.log('[useColorScheme] ✅ Event received, updating to:', newScheme);
      setColorScheme(newScheme);

      // Emit our custom event for other components
      channel.emit(COLOR_SCHEME_EVENT, newScheme);
    };

    channel.on('updateGlobals', handleGlobalsUpdate);
    channel.on('setGlobals', handleGlobalsUpdate);

    return () => {
      channel.off('updateGlobals', handleGlobalsUpdate);
      channel.off('setGlobals', handleGlobalsUpdate);
    };
  }, []);

  return colorScheme;
}

/**
 * Custom hook to listen for brand theme changes - reads from URL params!
 */
function useBrandTheme() {
  const getInitialBrandTheme = (): BrandTheme => {
    if (typeof window === 'undefined') return 'digilist';
    const params = new URLSearchParams(window.location.search);
    const globalsParam = params.get('globals');
    if (globalsParam?.includes('brandTheme:xaheen')) return 'xaheen';
    if (globalsParam?.includes('brandTheme:digdir')) return 'digdir';
    if (globalsParam?.includes('brandTheme:digilist')) return 'digilist';
    if (globalsParam?.includes('brandTheme:altinn')) return 'altinn';
    if (globalsParam?.includes('brandTheme:brreg')) return 'brreg';
    if (globalsParam?.includes('brandTheme:platform')) return 'platform';
    return 'digilist';
  };

  const [brandTheme, setBrandTheme] = useState<BrandTheme>(getInitialBrandTheme);

  useEffect(() => {
    // Listen to globals updated event
    const handleGlobalsUpdate = (args: { globals?: { brandTheme?: string } }) => {
      const newTheme = (args.globals?.brandTheme as BrandTheme) || 'digilist';
      setBrandTheme(newTheme);
      currentBrandTheme = newTheme;
    };

    channel.on('updateGlobals', handleGlobalsUpdate);
    channel.on('setGlobals', handleGlobalsUpdate);

    return () => {
      channel.off('updateGlobals', handleGlobalsUpdate);
      channel.off('setGlobals', handleGlobalsUpdate);
    };
  }, []);

  return brandTheme;
}

/**
 * Hook to get current locale from Storybook globals - reads from URL params!
 */
function useDocsLocale() {
  const getInitialLocale = (): string => {
    if (typeof window === 'undefined') return 'nb';
    const params = new URLSearchParams(window.location.search);
    const globalsParam = params.get('globals');
    if (globalsParam?.includes('locale:en')) return 'en';
    if (globalsParam?.includes('locale:ar')) return 'ar';
    if (globalsParam?.includes('locale:nb')) return 'nb';
    return 'nb';
  };

  const [locale, setLocale] = useState<string>(getInitialLocale);

  useEffect(() => {
    const handleGlobalsUpdate = (args: { globals?: { locale?: string } }) => {
      const newLocale = (args.globals?.locale as string) || 'nb';
      setLocale(newLocale);
    };

    channel.on('updateGlobals', handleGlobalsUpdate);
    channel.on('setGlobals', handleGlobalsUpdate);

    return () => {
      channel.off('updateGlobals', handleGlobalsUpdate);
      channel.off('setGlobals', handleGlobalsUpdate);
    };
  }, []);

  return locale;
}

/**
 * Themed DocsContainer that responds to color scheme toggle and brand theme
 * Wraps content with StoryProvider to enable translations in MDX files
 * Uses design tokens for all styling - no hardcoded colors!
 */
function ThemedDocsContainer(props: React.ComponentProps<typeof DocsContainer>) {
  // Use our custom hooks that read from URL and listen to channel events
  const colorScheme = useColorScheme();
  const brandTheme = useBrandTheme();
  const locale = useDocsLocale();

  console.log('[ThemedDocsContainer] Using globals:', { colorScheme, brandTheme, locale });

  const themes = themeRegistry[brandTheme] || themeRegistry.digilist;
  const selectedTheme = colorScheme === 'dark' ? themes.dark : themes.light;

  // Apply data attributes AND inject theme CSS
  useEffect(() => {
    // Inject theme CSS (critical for CSS variables to be defined!)
    const themeStyleId = 'docs-theme-css';
    let themeStyle = document.getElementById(themeStyleId) as HTMLStyleElement | null;

    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = themeStyleId;
      document.head.appendChild(themeStyle);
    }

    const themeCSS = getThemeCSS(brandTheme as ThemeId);
    themeStyle.textContent = themeCSS;
    console.log('[Docs Theme] Injected theme CSS:', brandTheme, 'length:', themeCSS.length);

    // Apply data attributes for theme CSS selectors
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-brand-theme', brandTheme);

    // Also apply class for CSS selectors that use .dark class
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    console.log('[Docs Theme] ✅ Applied:', { colorScheme, brandTheme, cssVarsLoaded: themeCSS.length > 0 });
  }, [colorScheme, brandTheme]);

  // Inject CSS that maps Storybook docs to design tokens
  // CRITICAL: This must re-run when colorScheme changes to update CSS!
  useEffect(() => {
    const styleId = 'storybook-docs-design-tokens';

    // Remove existing style and recreate it (ensures CSS updates)
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);

    // Use design tokens - they update automatically via CSS variables!
    styleElement.textContent = `
      /* Smooth transitions */
      .sbdocs-wrapper,
      .sbdocs-content,
      .sbdocs * {
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
      }
      
      /* AGGRESSIVE: Override ALL possible Storybook docs backgrounds */
      html,
      body,
      #storybook-docs,
      #storybook-root,
      #root,
      .sb-show-main,
      .sb-main-padded,
      .docs-story,
      .sbdocs,
      .sbdocs-wrapper,
      .sbdocs-content,
      .sbdocs > div,
      .sbdocs > section,
      [id^="story--"],
      [id^="anchor--"],
      main,
      section {
        background-color: var(--ds-color-neutral-background-default) !important;
        background: var(--ds-color-neutral-background-default) !important;
        color: var(--ds-color-neutral-text-default) !important;
      }
      
      /* Fix padding: Prevent content from going under sidebar */
      .sbdocs-wrapper,
      .sbdocs-content {
        padding-left: calc(var(--ds-size-8) + 10px) !important;
        padding-right: var(--ds-size-8) !important;
      }
      
      /* Ensure main content area has proper spacing */
      .sbdocs {
        padding-left: calc(var(--ds-size-8) + 10px) !important;
        padding-right: var(--ds-size-8) !important;
      }
      
      /* Force iframe content */
      iframe {
        background-color: transparent !important;
      }
      
      /* Text elements */
      .sbdocs h1, .sbdocs h2, .sbdocs h3, 
      .sbdocs h4, .sbdocs h5, .sbdocs h6,
      .sbdocs p, .sbdocs li, .sbdocs td, .sbdocs th {
        color: var(--ds-color-neutral-text-default) !important;
      }
      
      /* Links */
      .sbdocs a {
        color: var(--ds-color-accent-base-default) !important;
      }
      
      .sbdocs a:hover {
        color: var(--ds-color-accent-base-hover) !important;
      }
      
      /* Code blocks */
      .sbdocs pre,
      .sbdocs code {
        background-color: var(--ds-color-neutral-surface-hover) !important;
        color: var(--ds-color-neutral-text-default) !important;
        border-color: var(--ds-color-neutral-border-default) !important;
      }
      
      /* Tables */
      .sbdocs table {
        border-color: var(--ds-color-neutral-border-default) !important;
      }
      
      .sbdocs th {
        background-color: var(--ds-color-neutral-surface-hover) !important;
        color: var(--ds-color-neutral-text-default) !important;
      }
      
      /* Borders */
      .sbdocs hr,
      [role="separator"] {
        border-color: var(--ds-color-neutral-border-default) !important;
      }
      
      /* Scrollbars */
      *::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      
      *::-webkit-scrollbar-track {
        background: var(--ds-color-neutral-surface-hover);
      }
      
      *::-webkit-scrollbar-thumb {
        background: var(--ds-color-neutral-border-default);
        border-radius: 6px;
      }
      
      *::-webkit-scrollbar-thumb:hover {
        background: var(--ds-color-neutral-text-subtle);
      }
      
      /* Hide Storybook's default iframe close button for modals */
      .docs-story iframe + button,
      .docs-story iframe ~ button,
      .sbdocs iframe + button,
      .sbdocs iframe ~ button,
      [data-testid="storybook-iframe-wrapper"] button,
      .os-host[data-testid] button,
      .os-padding[data-testid] button,
      /* Storybook's iframe container close buttons */
      .os-host button[aria-label*="close" i],
      .os-host button[aria-label*="Close" i],
      .os-viewport button[aria-label*="close" i],
      .os-viewport button[aria-label*="Close" i],
      /* Any button positioned absolutely in iframe containers */
      .docs-story .os-host > button,
      .docs-story .os-viewport > button,
      /* Storybook's story wrapper close buttons */
      .docs-story > div > button[aria-label*="close" i],
      .docs-story > div > button[aria-label*="Close" i],
      .sbdocs .docs-story button[aria-label*="close" i],
      .sbdocs .docs-story button[aria-label*="Close" i],
      /* Hide buttons with specific Storybook classes */
      button[class*="close"],
      button[class*="Close"],
      /* Hide buttons that are siblings of iframes */
      iframe ~ button:not([data-testid]),
      /* Hide any button in the iframe wrapper that's not part of the story */
      .os-host:has(iframe) > button:not([data-testid]),
      .os-viewport:has(iframe) > button:not([data-testid]) {
        display: none !important;
      }
    `;

    console.log('[Docs CSS] Re-injected design token CSS for:', colorScheme);
  }, [colorScheme]); // Re-run when colorScheme changes!

  return (
    <DocsContainer {...props} theme={selectedTheme}>
      <StoryProvider locale={locale} theme={brandTheme} colorScheme={colorScheme}>
        {props.children}
      </StoryProvider>
    </DocsContainer>
  );
}

// RTL locales mapping
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];
const getDirectionForLocale = (locale: string): 'ltr' | 'rtl' =>
  RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

// Custom Norwegian viewports
const customViewports = {
  mobileNorway: {
    name: 'Mobile (Norway)',
    styles: { width: '375px', height: '667px' },
    type: 'mobile' as const,
  },
  tabletNorway: {
    name: 'Tablet (Norway)',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet' as const,
  },
  desktopNorway: {
    name: 'Desktop (Norway)',
    styles: { width: '1280px', height: '800px' },
    type: 'desktop' as const,
  },
  accessibleLarge: {
    name: 'Accessible (Large)',
    styles: { width: '1920px', height: '1080px' },
    type: 'desktop' as const,
  },
};

/**
 * Theme decorator - uses custom color scheme control and StoryProvider for theme/translations
 */
const withTheme: Decorator = (Story, context) => {
  // Get color scheme, locale, and brand theme from global toolbar
  const colorScheme = (context.globals.colorScheme as 'light' | 'dark') || 'light';
  const locale = (context.globals.locale as string) || 'nb';
  const brandTheme = (context.globals.brandTheme as BrandTheme) || 'digilist';
  const direction = getDirectionForLocale(locale);

  // Update module-level brandTheme for docs container
  currentBrandTheme = brandTheme;

  useEffect(() => {
    // Apply color scheme to document for CSS variables
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    // Apply direction and language for RTL support
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', locale);
    // Apply brand theme as data attribute for potential CSS targeting
    document.documentElement.setAttribute('data-brand-theme', brandTheme);

    // Update color scheme class for proper theme application
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // Emit color scheme change event for manager
    channel.emit(COLOR_SCHEME_EVENT, colorScheme);
  }, [colorScheme, brandTheme, locale, direction]); // Depend on all theme-related values

  // StoryProvider integrates I18nProvider + DesignsystemetProvider
  // Similar to RuntimeProvider pattern in production apps
  // Key only forces remount when locale changes (I18nProvider requires this)
  // Theme and colorScheme changes are handled reactively without remount
  return (
    <StoryProvider key={locale} locale={locale} theme={brandTheme} colorScheme={colorScheme}>
      <div
        data-color-scheme={colorScheme}
        data-brand-theme={brandTheme}
        data-size="md"
        dir={direction}
        lang={locale}
        style={{
          padding: 'var(--ds-size-4)',
          fontFamily: 'Inter, system-ui, sans-serif',
          minHeight: '100vh',
          width: '100%',
          backgroundColor: 'var(--ds-color-neutral-background-default)',
          color: 'var(--ds-color-neutral-text-default)',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        <Story />
      </div>
    </StoryProvider>
  );
};


const preview: Preview = {
  globalTypes: {
    colorScheme: {
      name: 'Color Scheme',
      description: 'Switch between light and dark mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light Mode', icon: 'sun' },
          { value: 'dark', title: 'Dark Mode', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    brandTheme: {
      name: 'Brand Theme',
      description: 'Switch between brand color themes',
      defaultValue: 'digilist',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'digilist', title: 'Digilist (Blue)', right: '🔵' },
          { value: 'xaheen', title: 'Xaheen (Gold)', right: '🟡' },
          { value: 'platform', title: 'Platform (Blue/Gold)', right: '🟦' },
          { value: 'digdir', title: 'Digdir (Default)', right: '⚪' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'nb',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'nb', title: 'Norsk (LTR)', right: 'nb' },
          { value: 'en', title: 'English (LTR)', right: 'en' },
          { value: 'ar', title: 'العربية (RTL)', right: 'ar' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },
    docs: {
      toc: true,
      container: ThemedDocsContainer,
    },
    a11y: {
      context: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
    backgrounds: {
      disabled: true,
    },
    viewport: {
      options: {
        ...MINIMAL_VIEWPORTS,
        ...INITIAL_VIEWPORTS,
        ...customViewports,
      },
    },
    options: {
      storySort: {
        order: [
          'Overview',
          ['Introduction', 'Getting Started', 'Principles'],
          'Fundamentals',
          ['Tokens', 'Typography', 'Colors', 'Spacing', 'Accessibility', 'Best Practices', 'Patterns', 'Theme Builder'],
          'Components',
          'Composed',
          'Blocks',
          'Primitives',
          'Patterns',
          'Contributing',
        ],
      },
    },
  },
  decorators: [withTheme],
  tags: ['autodocs'],
};

export default preview;
