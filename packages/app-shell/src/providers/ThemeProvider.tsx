/**
 * ThemeProvider — Shared color scheme for DesignsystemetProvider
 *
 * Manages light/dark/auto theme with system preference detection and localStorage persistence.
 * Used by web, minside, and other Digilist apps.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '@digipicks/shared/constants';

export type ColorScheme = 'light' | 'dark' | 'auto';

export interface ThemeContextValue {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
  /** Resets to auto mode (follows system preference) */
  resetToAuto: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'auto',
  toggleTheme: () => {},
  setColorScheme: () => {},
  isDark: false,
  resetToAuto: () => {},
});

export interface ThemeProviderProps {
  children: ReactNode;
  /** Storage key for persisting theme preference */
  storageKey?: string;
}

/**
 * ThemeProvider - Provides theme context with system preference detection
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <DesignsystemetProvider colorScheme={colorScheme}>
 *     <App />
 *   </DesignsystemetProvider>
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, storageKey = THEME_STORAGE_KEY }: ThemeProviderProps): React.ReactElement {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return 'auto';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      if (scheme === 'auto') {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, scheme);
      }
    },
    [storageKey],
  );

  const resetToAuto = useCallback(() => {
    setColorSchemeState('auto');
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const isDark = colorScheme === 'auto' ? systemPrefersDark : colorScheme === 'dark';

  const toggleTheme = useCallback(() => {
    setColorScheme(isDark ? 'light' : 'dark');
  }, [isDark, setColorScheme]);

  const value: ThemeContextValue = {
    colorScheme,
    toggleTheme,
    setColorScheme,
    isDark,
    resetToAuto,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
