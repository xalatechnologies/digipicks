/**
 * CreatorsPage — Web App
 *
 * Public creator discovery marketplace. Browse creators by sport and performance.
 * Data source: api.domain.picks.leaderboard via useLeaderboard (real-time).
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Spinner, NativeSelect, Textfield, Tag, EmptyState } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useLeaderboard } from '@digipicks/sdk';
import type { LeaderboardEntry, LeaderboardSortBy } from '@digipicks/sdk';
import { env } from '@digipicks/app-shell';
import s from './creators.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORTS = ['All', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC', 'Tennis', 'Golf'];

type SortKey = 'trending' | 'roi' | 'picks' | 'new';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'roi', label: 'Top ROI' },
  { value: 'picks', label: 'Most Picks' },
  { value: 'new', label: 'New' },
];

function sortKeyToLeaderboardSort(key: SortKey): LeaderboardSortBy {
  switch (key) {
    case 'roi':
      return 'roi';
    case 'picks':
      return 'totalPicks';
    case 'new':
      return 'totalPicks'; // No dedicated "new" sort in leaderboard; see TODO below
    case 'trending':
    default:
      return 'streak';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string | null): string {
  if (!name) return '?';
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

function formatWinRate(rate: number): string {
  return `${rate.toFixed(0)}%`;
}

function handleFromName(name: string | undefined): string {
  if (!name) return '@creator';
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function CreatorCard({
  entry,
  onClick,
  t,
}: {
  entry: LeaderboardEntry;
  onClick: () => void;
  t: ReturnType<typeof useT>;
}) {
  const name = entry.creator?.displayName || entry.creator?.name || 'Unknown';

  return (
    <Card
      className={s.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={s.cardHeader}>
        {entry.creator?.avatarUrl ? (
          <img src={entry.creator.avatarUrl} alt={name} className={s.avatar} />
        ) : (
          <div className={s.avatarPlaceholder}>{getInitials(name)}</div>
        )}
        <div className={s.nameBlock}>
          <Paragraph className={s.creatorName}>{name}</Paragraph>
          <Paragraph className={s.creatorHandle}>
            {handleFromName(entry.creator?.name ?? entry.creator?.displayName)}
          </Paragraph>
        </div>
      </div>

      <div className={s.tagRow}>
        <Tag data-color="accent">{t('creators.card.verified', 'Creator')}</Tag>
      </div>

      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>{t('creators.card.winRate', 'Win %')}</span>
          <span className={s.statValue}>{formatWinRate(entry.winRate)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>{t('creators.card.roi', 'ROI')}</span>
          <span className={`${s.statValue} ${entry.roi >= 0 ? s.roiPositive : s.roiNegative}`}>
            {formatRoi(entry.roi)}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>{t('creators.card.picks', 'Picks')}</span>
          <span className={s.statValue}>{entry.totalPicks}</span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CreatorsPage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env.tenantId as any;

  const [search, setSearch] = useState('');
  const [sport, setSport] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('trending');

  const { entries, isLoading } = useLeaderboard(tenantId, {
    sport: sport === 'All' ? undefined : sport,
    timeframe: '30d',
    sortBy: sortKeyToLeaderboardSort(sortKey),
    limit: 60,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = (e.creator?.displayName || e.creator?.name || '').toLowerCase();
      return name.includes(q);
    });
  }, [entries, search]);

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <div className={s.pageHeader}>
        <Heading data-size="lg" className={s.pageTitle}>
          {t('creators.title', 'Find your creator')}
        </Heading>
        <Paragraph className={s.pageSubtitle}>
          {t(
            'creators.subtitle',
            'Browse verified sports handicappers ranked by real performance. Subscribe to the ones whose picks you trust.',
          )}
        </Paragraph>
      </div>

      {/* Filter bar */}
      <div className={s.filterBar}>
        <Textfield
          label={t('creators.filters.search', 'Search creators')}
          placeholder={t('creators.filters.searchPlaceholder', 'Name or handle...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NativeSelect
          label={t('creators.filters.sport', 'Sport')}
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        >
          {SPORTS.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          label={t('creators.filters.sortBy', 'Sort by')}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={s.loadingState}>
          <Spinner aria-label={t('common.loading', 'Loading')} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title={t('creators.empty.title', 'No creators match your filters')}
          description={t(
            'creators.empty.description',
            'Try adjusting your sport or search terms, or check back soon as more creators join.',
          )}
        />
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className={s.grid}>
          {filtered.map((entry) => (
            <CreatorCard
              key={entry.creatorId}
              entry={entry}
              onClick={() => navigate(`/creator/${entry.creatorId}`)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CreatorsPage;
