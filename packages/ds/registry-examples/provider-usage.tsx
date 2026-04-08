import React from 'react';
import { DesignsystemetProvider, type ColorScheme, type DsSize } from '@digilist-saas/ds';

/**
 * Example showing correct usage of DesignsystemetProvider.
 * 
 * The provider should be placed at the root of your application to manage
 * theme, color scheme, and size settings for all child components.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<'digdir' | 'altinn' | 'uutilsynet' | 'portal'>('digdir');
  const [colorScheme, setColorScheme] = React.useState<ColorScheme>('auto');
  const [size, setSize] = React.useState<DsSize>('md');

  return (
    <DesignsystemetProvider 
      theme={theme} 
      colorScheme={colorScheme} 
      size={size}
    >
      {children}
    </DesignsystemetProvider>
  );
}

/**
 * Alternative approach: Setting data attributes directly on the HTML root.
 * 
 * This achieves the same effect as the provider but gives you direct
 * control over the DOM attributes. Useful for integration with
 * non-React parts of your application.
 */
export function RootAttributes() {
  React.useEffect(() => {
    // You can also set these directly on document.documentElement
    document.documentElement.setAttribute('data-color-scheme', 'auto');
    document.documentElement.setAttribute('data-size', 'md');
    document.documentElement.setAttribute('data-typography', 'primary');
  }, []);

  return null;
}

/**
 * Import guidelines:
 * 
 * - WRONG: Importing Designsystemet CSS directly in app components
 * - WRONG: Importing theme CSS files in components
 * - CORRECT: Import styles once in your application's entry point (main.tsx)
 * 
 * @example
 * ```typescript
 * // In main.tsx - import once
 * import '@digilist-saas/ds/styles';
 * ```
 */
