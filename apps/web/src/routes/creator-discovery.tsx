/**
 * CreatorDiscoveryPage — Web App
 *
 * Browseable creator marketplace for subscribers to find and compare creators.
 * Search by name/handle/sport, filter by sport, view stats and pricing.
 * Real-time via Convex subscriptions.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Heading, Paragraph, Spinner, Textfield } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useCreatorDiscovery } from '@digipicks/sdk';
import type { DiscoveryCreator } from '@digipicks/sdk';
import { env, VerificationBadge } from '@digipicks/app-shell';
import { SportFilter } from '@/components/SportFilter';
import s from './creator-discovery.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRoi(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(1)}%`;
}

function formatPrice(price: { amount: number; currency: string; interval: string }): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
  }).format(price.amount / 100);
  return `${formatted}/${price.interval === 'monthly' ? 'mo' : price.interval}`;
}

// ---------------------------------------------------------------------------
// Creator Card
// ---------------------------------------------------------------------------

function CreatorCard({
  creator,
  onClick,
  t,
}: {
  creator: DiscoveryCreator;
  onClick: () => void;
  t: (key: string, fallback: string) => string;
}) {
  const { stats } = creator;

  return (
    <div className={s.creatorCard} onClick={onClick} role="button" tabIndex={0}>
      {/* Header: avatar + name + tagline */}
      <div className={s.cardHeader}>
        {creator.avatarUrl ? (
          <img src={creator.avatarUrl} alt={creator.name} className={s.avatar} />
        ) : (
          <div className={s.avatarPlaceholder}>{getInitials(creator.name)}</div>
        )}
        <div className={s.creatorInfo}>
          <div className={s.creatorName}>
            {creator.name}
            <VerificationBadge verified={creator.verified} verifiedAt={creator.verifiedAt} size="sm" />
          </div>
          {creator.tagline && <div className={s.creatorTagline}>{creator.tagline}</div>}
        </div>
      </div>

      {/* Stats grid */}
      <div className={s.statsRow}>
        <div className={s.stat}>
          <div className={`${s.statValue} ${stats.roi >= 0 ? s.roiPositive : s.roiNegative}`}>
            {formatRoi(stats.roi)}
          </div>
          <div className={s.statLabel}>{t('discovery.roi', 'ROI')}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statValue}>{stats.winRate.toFixed(1)}%</div>
          <div className={s.statLabel}>{t('discovery.winRate', 'Win Rate')}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statValue}>{stats.totalPicks}</div>
          <div className={s.statLabel}>{t('discovery.picks', 'Picks')}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statValue}>
            {stats.wins}W-{stats.losses}L
          </div>
          <div className={s.statLabel}>{t('discovery.record', 'Record')}</div>
        </div>
      </div>

      {/* Footer: price + streak + sport */}
      <div className={s.cardFooter}>
        <div>
          {creator.startingPrice && (
            <span className={s.price}>
              {t('discovery.from', 'From')} <span className={s.priceAmount}>{formatPrice(creator.startingPrice)}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--ds-size-2)' }}>
          {creator.sport && <span className={s.sportBadge}>{creator.sport}</span>}
          {stats.currentStreak > 0 && (
            <span className={`${s.streakBadge} ${stats.streakType === 'W' ? s.streakWin : s.streakLoss}`}>
              {stats.currentStreak}
              {stats.streakType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CreatorDiscoveryPage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env.tenantId as any;

  const [searchParams, setSearchParams] = useSearchParams();
  const sportParam = searchParams.get('sport') || 'All';

  const [searchInput, setSearchInput] = useState('');

  const handleSportChange = useCallback(
    (sport: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (sport === 'All') {
            next.delete('sport');
          } else {
            next.set('sport', sport);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Debounce search to avoid hammering the backend on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const { creators, isLoading } = useCreatorDiscovery(tenantId, {
    search: debouncedSearch || undefined,
    sport: sportParam === 'All' ? undefined : sportParam,
  });

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <div className={s.pageHeader}>
        <Heading data-size="lg" className={s.pageTitle}>
          {t('discovery.title', 'Discover Creators')}
        </Heading>
        <Paragraph className={s.pageSubtitle}>
          {t('discovery.subtitle', 'Find top-performing creators and subscribe to their picks.')}
        </Paragraph>
      </div>

      {/* Sport filter chips */}
      <SportFilter value={sportParam} onChange={handleSportChange} />

      {/* Search */}
      <div className={s.toolbar}>
        <div className={s.searchField}>
          <Textfield
            label={t('discovery.search', 'Search')}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('discovery.searchPlaceholder', 'Search by name, sport, or keyword...')}
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={s.loadingState}>
          <Spinner aria-label={t('common.loading', 'Loading')} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && creators.length === 0 && (
        <Card className={s.emptyState}>
          <Paragraph>
            {debouncedSearch
              ? t('discovery.noResults', 'No creators match your search. Try different keywords.')
              : t('discovery.empty', 'No creators available yet. Check back soon!')}
          </Paragraph>
        </Card>
      )}

      {/* Results */}
      {!isLoading && creators.length > 0 && (
        <>
          <div className={s.resultsCount}>
            {t('discovery.resultsCount', '{{count}} creators', { count: creators.length })}
          </div>
          <div className={s.creatorsGrid}>
            {creators.map((creator) => (
              <CreatorCard
                key={creator.creatorId}
                creator={creator}
                onClick={() => navigate(`/creator/${creator.creatorId}`)}
                t={t}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
