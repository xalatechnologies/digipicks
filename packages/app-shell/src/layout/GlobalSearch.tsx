/**
 * GlobalSearch — unified smart search for all apps
 *
 * Same UI, UX, and smart search capabilities (intents, popular, categories, results)
 * across web and dashboard. Uses usePublicGlobalSearch (web) or useGlobalSearch (dashboard).
 *
 * - Web: public listings (multi-tenant by default unless tenantId is passed)
 * - Dashboard: tenant-scoped resources (same smart suggestions)
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderSearch } from '@digipicks/ds';
import type { SearchResultItem, SearchResultGroup } from '@digipicks/ds';
import {
  usePublicGlobalSearch,
  usePublicListings,
  useGlobalSearch,
  useResolveTenantId,
  type TenantId,
  type Listing,
} from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { searchResponseToGroups } from './globalSearchUtils';

export type GlobalSearchContext = 'web' | 'dashboard' | 'learning';

/** URL builders for navigation — defaults per context, override via props */
export interface GlobalSearchUrlConfig {
  search?: (query: string) => string;
  category?: (categoryKey: string) => string;
  listing?: (slugOrId: string) => string;
  intent?: (intentKey: string) => string | null;
  popular?: (popularKey: string) => string | null;
}

const WEB_URLS: Required<GlobalSearchUrlConfig> = {
  search: (q) => `/?search=${encodeURIComponent(q)}`,
  category: (key) => `/?category=${encodeURIComponent(key)}`,
  listing: (slug) => `/listing/${slug}`,
  intent: (key) => {
    if (key === 'booking') return '/?sort=available';
    if (key === 'event') return '/?category=ARRANGEMENTER';
    if (key === 'location') return null;
    if (key === 'price') return '/?sort=price_asc';
    return null;
  },
  popular: (key) => `/?search=${encodeURIComponent(key.replace(/^popular_/, ''))}`,
};

const DASHBOARD_URLS: Required<GlobalSearchUrlConfig> = {
  search: (q) => `/search?q=${encodeURIComponent(q)}`,
  category: (key) => `/search?q=&category=${encodeURIComponent(key)}`,
  listing: (slug) => `/listings/${slug}`,
  intent: (key) => {
    if (key === 'booking') return '/search?type=booking';
    if (key === 'event') return '/search?category=ARRANGEMENTER';
    if (key === 'location') return null;
    if (key === 'price') return '/search?sort=price_asc';
    return null;
  },
  popular: (key) => `/search?q=${encodeURIComponent(key.replace(/^popular_/, ''))}`,
};

export interface GlobalSearchProps {
  /** web (public) | dashboard (tenant) | learning (stub) */
  context?: GlobalSearchContext;
  tenantId?: string;
  appId?: string;
  /** Override URL builders (merge with context defaults) */
  urlConfig?: Partial<GlobalSearchUrlConfig>;
  placeholder?: string;
  showShortcut?: boolean;
  enableGlobalShortcut?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function useTranslateAdapter(): ((key: string, fallback?: string) => string) | undefined {
  const t = useT();
  return useCallback(
    (key: string, fallback?: string) => {
      const r = t(key, { defaultValue: fallback });
      return typeof r === 'string' ? r : (fallback ?? key);
    },
    [t],
  );
}

function useWebSearchResults(tenantId?: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const t = useTranslateAdapter();

  const { data: searchData } = usePublicGlobalSearch({
    query: searchQuery,
    tenantId,
    limit: 20,
  });
  const { data: listingsData } = usePublicListings({
    tenantId,
    limit: 200,
  });

  const fallbackGroups = useMemo((): SearchResultGroup[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const listings = listingsData?.data ?? [];
    if (listings.length === 0) return [];

    const matches = listings.filter((l: Listing) => {
      const searchable = [
        l?.name,
        l?.description,
        l?.descriptionExcerpt,
        l?.locationFormatted,
        l?.city,
        l?.location?.city,
        l?.location?.municipality,
        l?.location?.address,
        ...(Array.isArray(l?.amenities) ? l.amenities : []),
        ...(Array.isArray(l?.metadata?.amenities) ? l.metadata.amenities : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });

    if (matches.length === 0) return [];

    return [
      {
        id: 'FALLBACK_RESULTS',
        label: t ? t('common.results', 'Resultater') : 'Resultater',
        items: matches.slice(0, 8).map((l: Listing) => ({
          id: l.slug || l.id,
          label: l.name || '',
          description: l.locationFormatted || l.descriptionExcerpt || l.description || undefined,
          icon: undefined,
          meta: l.categoryKey || undefined,
        })),
      },
    ];
  }, [listingsData, searchQuery, t]);

  const searchResults = useMemo(() => {
    const groups = searchResponseToGroups(searchData, t);
    return groups.length > 0 ? groups : fallbackGroups;
  }, [searchData, t, fallbackGroups]);

  const handleResultSelect = useCallback(
    (result: SearchResultItem, urls: Required<GlobalSearchUrlConfig>) => {
      if (result.id.startsWith('intent:')) {
        const intentKey = result.id.replace('intent:', '');
        const url = urls.intent(intentKey);
        if (url) navigate(url);
        else if (intentKey === 'location') navigate(urls.search(searchQuery));
        setSearchQuery('');
        return;
      }
      if (result.id.startsWith('popular:')) {
        const key = result.id.replace('popular:', '');
        const url = urls.popular(key);
        if (url) navigate(url);
        setSearchQuery('');
        return;
      }
      if (result.id.startsWith('category:')) {
        const categoryKey = result.id.replace('category:', '');
        navigate(urls.category(categoryKey));
        setSearchQuery('');
        return;
      }
      navigate(urls.listing(result.id));
      setSearchQuery('');
    },
    [navigate, searchQuery],
  );

  const handleSubmit = useCallback(
    (urls: Required<GlobalSearchUrlConfig>) => {
      if (searchQuery.trim()) {
        navigate(urls.search(searchQuery.trim()));
        setSearchQuery('');
      }
    },
    [navigate, searchQuery],
  );

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    handleResultSelect,
    handleSubmit,
    noResultsText: 'Ingen resultater',
  };
}

function useDashboardSearchResults(urls: Required<GlobalSearchUrlConfig>, resolvedTenantId: string | undefined) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const t = useTranslateAdapter();

  const { data: searchData } = useGlobalSearch({
    query: searchQuery,
    tenantId: resolvedTenantId ?? undefined,
    limit: 20,
  });

  const searchResults = useMemo(() => searchResponseToGroups(searchData, t), [searchData, t]);

  const handleResultSelect = useCallback(
    (result: SearchResultItem) => {
      if (result.id.startsWith('intent:')) {
        const intentKey = result.id.replace('intent:', '');
        const url = urls.intent(intentKey);
        if (url) navigate(url);
        else if (intentKey === 'location') navigate(urls.search(searchQuery));
        setSearchQuery('');
        return;
      }
      if (result.id.startsWith('popular:')) {
        const key = result.id.replace('popular:', '');
        const url = urls.popular(key);
        if (url) navigate(url);
        setSearchQuery('');
        return;
      }
      if (result.id.startsWith('category:')) {
        const categoryKey = result.id.replace('category:', '');
        navigate(urls.category(categoryKey));
        setSearchQuery('');
        return;
      }
      navigate(urls.listing(result.id));
      setSearchQuery('');
    },
    [navigate, searchQuery, urls],
  );

  const handleSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      navigate(urls.search(searchQuery.trim()));
      setSearchQuery('');
    }
  }, [navigate, searchQuery, urls]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    handleResultSelect,
    handleSubmit,
    noResultsText: 'Ingen resultater',
  };
}

function useLearningSearchResults() {
  const [searchQuery, setSearchQuery] = useState('');
  return {
    searchQuery,
    setSearchQuery,
    searchResults: [] as SearchResultGroup[],
    handleResultSelect: () => {},
    handleSubmit: () => {},
    noResultsText: 'Ingen resultater',
  };
}

/** Renders context-specific GlobalSearch — only calls the hook for active context */
function GlobalSearchWeb(props: Omit<GlobalSearchProps, 'context'>) {
  const baseUrls = WEB_URLS;
  const urls = useMemo(
    () => ({ ...baseUrls, ...props.urlConfig }) as Required<GlobalSearchUrlConfig>,
    [props.urlConfig],
  );
  // Keep preview scope aligned with full search results on the web listings page.
  // Only scope by tenant when explicitly provided by caller.
  const resolvedTenantId = props.tenantId ?? undefined;
  const state = useWebSearchResults(resolvedTenantId);
  return (
    <HeaderSearch
      placeholder={props.placeholder ?? 'Søk i lokaler, kategorier, populære søk...'}
      value={state.searchQuery}
      onSearchChange={state.setSearchQuery}
      onResultSelect={(r) => state.handleResultSelect(r, urls)}
      onSearch={() => state.handleSubmit(urls)}
      results={state.searchResults}
      showShortcut={props.showShortcut ?? true}
      enableGlobalShortcut={props.enableGlobalShortcut ?? true}
      noResultsText={state.noResultsText}
      className={props.className}
      style={props.style}
    />
  );
}

function GlobalSearchDashboard(props: Omit<GlobalSearchProps, 'context'>) {
  const resolvedTenantId = useResolveTenantId(props.tenantId as TenantId | undefined, props.appId ?? 'backoffice');
  const baseUrls = DASHBOARD_URLS;
  const urls = useMemo(
    () => ({ ...baseUrls, ...props.urlConfig }) as Required<GlobalSearchUrlConfig>,
    [props.urlConfig],
  );
  const state = useDashboardSearchResults(urls, resolvedTenantId);
  return (
    <HeaderSearch
      placeholder={props.placeholder ?? 'Søk i lokaler, kategorier, populære søk...'}
      value={state.searchQuery}
      onSearchChange={state.setSearchQuery}
      onResultSelect={state.handleResultSelect}
      onSearch={state.handleSubmit}
      results={state.searchResults}
      showShortcut={props.showShortcut ?? true}
      enableGlobalShortcut={props.enableGlobalShortcut ?? true}
      noResultsText={state.noResultsText}
      className={props.className}
      style={props.style}
    />
  );
}

function GlobalSearchLearning(props: Omit<GlobalSearchProps, 'context'>) {
  const state = useLearningSearchResults();
  return (
    <HeaderSearch
      placeholder={props.placeholder ?? 'Søk...'}
      value={state.searchQuery}
      onSearchChange={state.setSearchQuery}
      onResultSelect={state.handleResultSelect}
      onSearch={state.handleSubmit}
      results={state.searchResults}
      showShortcut={props.showShortcut ?? true}
      enableGlobalShortcut={props.enableGlobalShortcut ?? true}
      noResultsText={state.noResultsText}
      className={props.className}
      style={props.style}
    />
  );
}

export function GlobalSearch(props: GlobalSearchProps): React.ReactElement {
  const { context = 'dashboard', ...rest } = props;
  if (context === 'web') return <GlobalSearchWeb {...rest} />;
  if (context === 'dashboard') return <GlobalSearchDashboard {...rest} />;
  return <GlobalSearchLearning {...rest} />;
}

GlobalSearch.displayName = 'GlobalSearch';
