import { useState, useEffect } from 'react';

export const DS_BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof DS_BREAKPOINTS;

/**
 * Returns true when the viewport is at or above the given breakpoint.
 *
 * @example
 * const isDesktop = useBreakpoint('lg');   // true when >= 1024px
 * const isTablet  = useBreakpoint('md');   // true when >= 768px
 * const isCustom  = useBreakpoint(900);    // true when >= 900px
 */
export function useBreakpoint(breakpoint: Breakpoint | number = 'md'): boolean {
  const bp = typeof breakpoint === 'number' ? breakpoint : DS_BREAKPOINTS[breakpoint];
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= bp : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${bp}px)`);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [bp]);

  return matches;
}

/** @deprecated Use `!useBreakpoint('md')` or `useIsMobile()` from `@digilist-saas/ds` instead of local definitions. */
export function useIsMobile(breakpoint = 768): boolean {
  return !useBreakpoint(breakpoint);
}
