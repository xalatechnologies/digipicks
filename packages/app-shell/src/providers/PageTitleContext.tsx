/**
 * PageTitleContext
 *
 * Lightweight context so pages can declare their title and the header can render it.
 * Pages call useSetPageTitle(title, count?) — auto-clears on unmount.
 * The DashboardHeader reads usePageTitle() to render in the left slot.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface PageTitleValue {
  title: string | null;
  count?: number;
  setPageTitle: (title: string | null, count?: number) => void;
}

const PageTitleContext = createContext<PageTitleValue>({
  title: null,
  count: undefined,
  setPageTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [count, setCount] = useState<number | undefined>();

  const setPageTitle = useCallback((t: string | null, c?: number) => {
    setTitle(t);
    setCount(c);
  }, []);

  return (
    <PageTitleContext.Provider value={{ title, count, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

/** Pages call this — auto-clears on unmount */
export function useSetPageTitle(title: string, count?: number) {
  const { setPageTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setPageTitle(title, count);
    return () => setPageTitle(null);
  }, [title, count, setPageTitle]);
}

/** Header reads this */
export function usePageTitle(): { title: string | null; count?: number } {
  const { title, count } = useContext(PageTitleContext);
  return { title, count };
}
