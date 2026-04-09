import React from 'react';
import { DesignsystemetProvider, Select, Button, Label } from '@digipicks/ds';
import { DEFAULT_THEME, THEMES, type ThemeId } from '@digipicks/ds';

/**
 * Example: Runtime theme switching using DesignsystemetProvider.
 *
 * This component demonstrates how to create a theme switcher that allows
 * users to change the visual appearance of the application at runtime.
 * The provider manages theme loading through a single <link> element.
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<ThemeId>(DEFAULT_THEME);
  const [colorScheme, setColorScheme] = React.useState<'light' | 'dark' | 'auto'>('auto');
  const [size, setSize] = React.useState<'sm' | 'md' | 'lg'>('md');

  return (
    <DesignsystemetProvider theme={theme} colorScheme={colorScheme} size={size}>
      <div style={{ padding: 24 }}>
        <h2>Theme Controls</h2>

        <div style={{ marginBottom: 16 }}>
          <Label htmlFor="theme-select">Select Theme</Label>
          <Select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
            {Object.keys(THEMES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Label htmlFor="scheme-select">Color Scheme</Label>
          <Select
            id="scheme-select"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as 'light' | 'dark' | 'auto')}
          >
            <option value="auto">Auto (follows system)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Label htmlFor="size-select">Size Mode</Label>
          <Select id="size-select" value={size} onChange={(e) => setSize(e.target.value as 'sm' | 'md' | 'lg')}>
            <option value="sm">Small (compact)</option>
            <option value="md">Medium (default)</option>
            <option value="lg">Large (spacious)</option>
          </Select>
        </div>

        <Button onClick={() => console.log('Current theme:', theme)}>Test Button</Button>
      </div>
    </DesignsystemetProvider>
  );
}

/**
 * Hook for programmatic theme switching without the provider.
 *
 * This hook provides functions to directly manipulate theme properties
 * when you need more control than the provider offers. Useful for
 * integration with non-React code or advanced scenarios.
 *
 * @returns {Object} Theme manipulation functions
 * @returns {Function} setTheme - Changes the active theme
 * @returns {Function} setColorScheme - Sets light/dark/auto mode
 * @returns {Function} setSize - Adjusts component sizing
 */
export function useThemeSwitch() {
  const setTheme = React.useCallback((theme: ThemeId) => {
    // Update the theme link directly
    const link = document.getElementById('xala-ds-theme') as HTMLLinkElement;
    if (link && THEMES[theme]) {
      const themeValue = THEMES[theme];
      link.href = Array.isArray(themeValue) ? themeValue[0] : themeValue;
    }
  }, []);

  const setColorScheme = React.useCallback((scheme: 'light' | 'dark' | 'auto') => {
    document.documentElement.setAttribute('data-color-scheme', scheme);
  }, []);

  const setSize = React.useCallback((size: 'sm' | 'md' | 'lg') => {
    document.documentElement.setAttribute('data-size', size);
  }, []);

  return { setTheme, setColorScheme, setSize };
}

/**
 * Theme loading guidelines:
 *
 * Manual CSS imports are prohibited as they bypass the single import rule:
 *
 * @example
 * ```typescript
 * // WRONG - Direct theme/CSS import bypasses single-import rule
 * import '@digdir/designsystemet-css'; // or any theme CSS directly
 *
 * // CORRECT - Use the provider or helper functions
 * // The provider manages a single <link> element for theme CSS
 * // This ensures Designsystemet CSS is imported only once
 * ```
 *
 * Why this matters:
 * - Prevents CSS conflicts and duplication
 * - Enables runtime theme switching
 * - Maintains consistent styling across the application
 * - Respects Designsystemet's architecture requirements
 */
