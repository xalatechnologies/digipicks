/**
 * LeaderboardPage — Web App
 *
 * Public leaderboard ranking creators by ROI, win rate, streak, or volume.
 * Real-time via Convex subscriptions — updates when picks are graded.
 * Filter by sport and timeframe (30d / 90d / all-time).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Spinner, NativeSelect } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useLeaderboard } from '@digipicks/sdk';
import type { LeaderboardEntry, LeaderboardSortBy, LeaderboardTimeframe } from '@digipicks/sdk';
import { env } from '@digipicks/app-shell';
import s from './leaderboard.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORTS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF'];

const TIMEFRAMES: { value: LeaderboardTimeframe; label: string }[] = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const SORT_OPTIONS: { value: LeaderboardSortBy; label: string }[] = [
  { value: 'roi', label: 'ROI' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'streak', label: 'Streak' },
  { value: 'totalPicks', label: 'Total Picks' },
];

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
  return `${rate.toFixed(1)}%`;
}

function rankClass(rank: number): string {
  if (rank === 1) return s.rankGold;
  if (rank === 2) return s.rankSilver;
  if (rank === 3) return s.rankBronze;
  return '';
}

// ---------------------------------------------------------------------------
// Leaderboard Row
// ---------------------------------------------------------------------------

function LeaderboardRow({ entry, onClick }: { entry: LeaderboardEntry; onClick: () => void }) {
  const name = entry.creator?.displayName || entry.creator?.name || 'Unknown';

  return (
    <div className={s.leaderboardRow} onClick={onClick} role="button" tabIndex={0}>
      <div className={`${s.rank} ${rankClass(entry.rank)}`}>{entry.rank}</div>

      <div className={s.creatorCell}>
        {entry.creator?.avatarUrl ? (
          <img src={entry.creator.avatarUrl} alt={name} className={s.avatar} />
        ) : (
          <div className={s.avatarPlaceholder}>{getInitials(name)}</div>
        )}
        <div>
          <div className={s.creatorName}>{name}</div>
          <div className={s.creatorRecord}>
            {entry.wins}W - {entry.losses}L{entry.pushes > 0 ? ` - ${entry.pushes}P` : ''}
          </div>
        </div>
      </div>

      <div className={`${s.statCell} ${entry.roi >= 0 ? s.roiPositive : s.roiNegative}`}>{formatRoi(entry.roi)}</div>

      <div className={`${s.statCell} ${s.hideOnMobile}`}>{formatWinRate(entry.winRate)}</div>

      <div className={`${s.statCell} ${s.hideOnMobile}`}>
        {entry.currentStreak > 0 ? (
          <span className={`${s.streakBadge} ${entry.streakType === 'W' ? s.streakWin : s.streakLoss}`}>
            {entry.currentStreak}
            {entry.streakType}
          </span>
        ) : (
          <span>—</span>
        )}
      </div>

      <div className={`${s.statCell} ${s.hideOnMobile}`}>
        {entry.netUnits >= 0 ? '+' : ''}
        {entry.netUnits.toFixed(1)}u
      </div>

      <div className={s.statCell}>{entry.totalPicks}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeaderboardPage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env('VITE_TENANT_ID') as any;

  const [sport, setSport] = useState<string>('All');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('30d');
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('roi');

  const { entries, isLoading } = useLeaderboard(tenantId, {
    sport: sport === 'All' ? undefined : sport,
    timeframe,
    sortBy,
    limit: 50,
  });

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <div className={s.pageHeader}>
        <Heading data-size="lg" className={s.pageTitle}>
          {t('leaderboard.title', 'Creator Leaderboard')}
        </Heading>
        <Paragraph className={s.pageSubtitle}>
          {t('leaderboard.subtitle', 'Top creators ranked by performance. Updated in real-time.')}
        </Paragraph>
      </div>

      {/* Filters */}
      <div className={s.filters}>
        <div className={s.filterItem}>
          <NativeSelect
            label={t('leaderboard.sport', 'Sport')}
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className={s.filterItem}>
          <NativeSelect
            label={t('leaderboard.timeframe', 'Timeframe')}
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as LeaderboardTimeframe)}
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className={s.filterItem}>
          <NativeSelect
            label={t('leaderboard.sortBy', 'Sort By')}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as LeaderboardSortBy)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={s.loadingState}>
          <Spinner aria-label={t('common.loading', 'Loading')} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <Card className={s.emptyState}>
          <Paragraph>{t('leaderboard.empty', 'No creators with graded picks yet. Check back soon!')}</Paragraph>
        </Card>
      )}

      {/* Leaderboard */}
      {!isLoading && entries.length > 0 && (
        <Card>
          <div className={s.leaderboardTable}>
            {/* Header row */}
            <div className={`${s.leaderboardRow} ${s.leaderboardHeader}`}>
              <div>#</div>
              <div>{t('leaderboard.creator', 'Creator')}</div>
              <div className={s.sortableHeader}>{t('leaderboard.roi', 'ROI')}</div>
              <div className={`${s.sortableHeader} ${s.hideOnMobile}`}>{t('leaderboard.winRate', 'Win Rate')}</div>
              <div className={`${s.sortableHeader} ${s.hideOnMobile}`}>{t('leaderboard.streak', 'Streak')}</div>
              <div className={`${s.sortableHeader} ${s.hideOnMobile}`}>{t('leaderboard.units', 'Units')}</div>
              <div className={s.sortableHeader}>{t('leaderboard.picks', 'Picks')}</div>
            </div>

            {/* Data rows */}
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.creatorId}
                entry={entry}
                onClick={() => navigate(`/creator/${entry.creatorId}`)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
