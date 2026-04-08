/**
 * Injects theme CSS from the bundle (no runtime copy from /themes/).
 * Dynamically imports theme CSS with ?inline and injects into document head.
 */
import * as React from 'react';
import type { ThemeId } from '@digilist-saas/ds';

const THEME_IMPORTS: Record<string, () => Promise<{ default: string }>> = {
  digilist: () =>
    import('@digilist-saas/ds/themes/digilist-theme.css?inline').then((m) => m as { default: string }),
  'xala-navy': () =>
    import('@digilist-saas/ds/themes/xala-navy-theme.css?inline').then((m) => m as { default: string }),
  steinkjer: () =>
    import('@digilist-saas/ds/themes/steinkjer-theme.css?inline').then((m) => m as { default: string }),
  hamar: () =>
    import('@digilist-saas/ds/themes/hamar-theme.css?inline').then((m) => m as { default: string }),
  digdir: () =>
    import('@digilist-saas/ds/themes/digilist-theme.css?inline').then((m) => m as { default: string }),
  altinn: () =>
    import('@digilist-saas/ds/themes/digilist-theme.css?inline').then((m) => m as { default: string }),
  uutilsynet: () =>
    import('@digilist-saas/ds/themes/digilist-theme.css?inline').then((m) => m as { default: string }),
  portal: () =>
    import('@digilist-saas/ds/themes/digilist-theme.css?inline').then((m) => m as { default: string }),
};

const STYLE_ID = 'dynamic-theme-css';

export function useBundledTheme(themeId: ThemeId): void {
  React.useEffect(() => {
    const load = THEME_IMPORTS[themeId] ?? THEME_IMPORTS['xala-navy'];
    let cancelled = false;

    load().then((mod) => {
      if (cancelled) return;
      let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
      }
      style.textContent = mod.default;
    });

    return () => {
      cancelled = true;
    };
  }, [themeId]);
}
