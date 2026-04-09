/**
 * Shared utilities for GlobalSearch.
 * Transforms SearchResponse to SearchResultGroup[] for HeaderSearch.
 * Same UI/UX structure for web and dashboard.
 */

import React from 'react';
import { SearchIcon, CalendarIcon, BuildingIcon, SportIcon, ShoppingCartIcon } from '@digipicks/ds';
import type { SearchResultItem, SearchResultGroup } from '@digipicks/ds';
import type { SearchResponse, CategorySuggestion, IntentSuggestion } from '@digipicks/sdk';

export function getCategoryIcon(categoryKey?: string): React.ReactNode {
  switch (categoryKey) {
    case 'LOKALER':
      return <BuildingIcon size={18} />;
    case 'SPORT':
      return <SportIcon size={18} />;
    case 'ARRANGEMENTER':
      return <CalendarIcon size={18} />;
    case 'TORGET':
      return <ShoppingCartIcon size={18} />;
    default:
      return <SearchIcon size={18} />;
  }
}

export function getCategoryLabel(categoryKey: string, t?: (key: string, fallback?: string) => string): string {
  const fallbacks: Record<string, string> = {
    LOKALER: 'Lokaler',
    SPORT: 'Sport',
    ARRANGEMENTER: 'Arrangementer',
    TORGET: 'Torget',
  };
  const fallback = fallbacks[categoryKey] ?? categoryKey;
  return t ? t(`categories.${categoryKey.toLowerCase()}`, fallback) : fallback;
}

const LABELS = {
  quickActions: 'Hurtighandlinger',
  popularSearches: 'Populære søk',
  categories: 'Kategorier',
};

export type TranslateFn = (key: string, fallback?: string) => string;

export function searchResponseToGroups(searchData: SearchResponse | null, t?: TranslateFn): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];
  const label = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);

  // Intent suggestions first (e.g., "Find available times")
  if (searchData?.intentSuggestions && searchData.intentSuggestions.length > 0) {
    const intentItems: SearchResultItem[] = searchData.intentSuggestions.map((intent: IntentSuggestion) => ({
      id: `intent:${intent.key}`,
      label: intent.label,
      description: intent.description,
      icon: getCategoryIcon(intent.category),
      meta: '✨',
    }));
    groups.push({
      id: 'INTENTS',
      label: label('common.quickActions', LABELS.quickActions),
      items: intentItems.slice(0, 2),
    });
  }

  // Popular searches
  if (searchData?.popularSuggestions && searchData.popularSuggestions.length > 0) {
    const popularItems: SearchResultItem[] = searchData.popularSuggestions.map((pop: IntentSuggestion) => ({
      id: `popular:${pop.key}`,
      label: pop.label,
      description: pop.description,
      icon: getCategoryIcon(pop.category),
      meta: '🔥',
    }));
    groups.push({
      id: 'POPULAR',
      label: label('common.popularSearches', LABELS.popularSearches),
      items: popularItems.slice(0, 3),
    });
  }

  // Category suggestions
  if (searchData?.categorySuggestions && searchData.categorySuggestions.length > 0) {
    const categoryItems: SearchResultItem[] = searchData.categorySuggestions.map((cat: CategorySuggestion) => ({
      id: `category:${cat.key}`,
      label: cat.name,
      description: cat.description,
      icon: getCategoryIcon(cat.key),
      meta: cat.resourceCount ? `${cat.resourceCount} annonser` : undefined,
    }));
    groups.push({
      id: 'CATEGORIES',
      label: label('common.categories', LABELS.categories),
      items: categoryItems.slice(0, 3),
    });
  }

  if (!searchData?.results || searchData.results.length === 0) {
    return groups;
  }

  // Group results by category
  const groupedByCategory: Record<string, SearchResultItem[]> = {};
  for (const result of searchData.results) {
    const category = result.categoryKey || 'OTHER';
    if (!groupedByCategory[category]) groupedByCategory[category] = [];
    const slug = result.url?.replace(/^\/listing\//, '').replace(/^\/listings\//, '') || result.id;
    groupedByCategory[category].push({
      id: slug,
      label: result.title,
      description: result.description,
      icon: getCategoryIcon(result.categoryKey),
      meta: result.categoryKey,
    });
  }

  for (const [category, items] of Object.entries(groupedByCategory)) {
    groups.push({
      id: category,
      label: getCategoryLabel(category, t),
      items: items.slice(0, 5),
    });
  }

  return groups;
}
