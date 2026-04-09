/**
 * PickTrackerPage — Web App
 *
 * Personal P/L dashboard for subscribers who tail picks.
 * Shows aggregated stats, bankroll tracker, sport breakdown,
 * and a filterable history of all tailed picks with outcomes.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Stack, NativeSelect, Textfield, StatusTag } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useMyTailedPicks, useMyTrackerStats, useUntailPick } from '@digipicks/sdk';
import type { TailedPick } from '@digipicks/sdk';
import { useAuth, env } from '@digipicks/app-shell';
import s from './pick-tracker.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORTS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF'];
const RESULTS = ['All', 'pending', 'won', 'lost', 'push', 'void'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resultColor(result: string): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (result) {
    case 'won':
      return 'success';
    case 'lost':
      return 'danger';
    case 'push':
      return 'warning';
    case 'void':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function pickPL(pick: TailedPick): { value: number; label: string } {
  if (!pick.units || !pick.oddsDecimal) return { value: 0, label: '-' };
  if (pick.result === 'won') {
    const profit = pick.units * (pick.oddsDecimal - 1);
    return { value: profit, label: `+${profit.toFixed(2)}u` };
  }
  if (pick.result === 'lost') {
    return { value: -pick.units, label: `-${pick.units.toFixed(2)}u` };
  }
  if (pick.result === 'push') {
    return { value: 0, label: '0u' };
  }
  return { value: 0, label: '-' };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <Card className={s.statCard}>
      <div className={s.statLabel}>{label}</div>
      <div className={`${s.statValue} ${colorClass ?? ''}`}>{value}</div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pick Row
// ---------------------------------------------------------------------------

function PickRow({ pick, onUntail }: { pick: TailedPick; onUntail: (pickId: string) => void }) {
  const pl = pickPL(pick);
  const plClass = pl.value > 0 ? s.plPositive : pl.value < 0 ? s.plNegative : s.plNeutral;

  return (
    <Card className={s.pickRow}>
      <div className={s.pickMain}>
        <div className={s.pickEvent}>
          <Link to={`/creator/${pick.creatorId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {pick.creator?.displayName || pick.creator?.name || 'Unknown'}
          </Link>
          {' — '}
          {pick.event}
        </div>
        <div className={s.pickMeta}>
          <StatusTag color="neutral" data-size="sm">
            {pick.sport}
          </StatusTag>
          <StatusTag color="neutral" data-size="sm">
            {pick.pickType}
          </StatusTag>
          {pick.selection && <span>{pick.selection}</span>}
          {pick.oddsAmerican && <span>{pick.oddsAmerican}</span>}
          {pick.units && <span>{pick.units}u</span>}
          <span>{formatDate(pick.tailedAt)}</span>
        </div>
      </div>

      {pick.result !== 'pending' ? (
        <StatusTag color={resultColor(pick.result)} data-size="sm">
          {pick.result.toUpperCase()}
        </StatusTag>
      ) : (
        <StatusTag color="neutral" data-size="sm">
          PENDING
        </StatusTag>
      )}

      <div className={`${s.pickPl} ${plClass}`}>{pl.label}</div>

      <Button
        data-size="sm"
        variant="tertiary"
        color="danger"
        className={s.untailButton}
        onClick={() => onUntail(pick.id)}
      >
        Untail
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function PickTrackerPage() {
  const t = useT();
  const navigate = useNavigate();
  const auth = useAuth();
  const tenantId = env.tenantId as string | undefined;
  const userId = auth.user?.id;

  const [sportFilter, setSportFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');
  const [bankrollInput, setBankrollInput] = useState('');

  const startingBankroll = bankrollInput ? parseFloat(bankrollInput) : undefined;

  const filterParams = useMemo(
    () => ({
      sport: sportFilter !== 'All' ? sportFilter : undefined,
      result: resultFilter !== 'All' ? resultFilter : undefined,
    }),
    [sportFilter, resultFilter],
  );

  const { picks, isLoading: picksLoading } = useMyTailedPicks(tenantId as any, userId, filterParams);
  const { stats, isLoading: statsLoading } = useMyTrackerStats(tenantId as any, userId, startingBankroll);
  const { mutateAsync: untailAsync } = useUntailPick();

  const isLoading = picksLoading || statsLoading;

  const handleUntail = async (pickId: string) => {
    if (!userId) return;
    try {
      await untailAsync({ userId: userId as any, pickId });
    } catch {
      // Silently handle — Convex will update reactively
    }
  };

  // Not logged in
  if (!auth.isAuthenticated) {
    return (
      <div className={s.pageContainer}>
        <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
          <Heading level={1} data-size="lg" className={s.title}>
            {t('picks.tracker.title', 'Pick Tracker')}
          </Heading>
        </Stack>
        <div className={s.loginPrompt}>
          <Paragraph className={s.loginPromptText}>
            {t('picks.tracker.loginPrompt', 'Sign in to track your picks and see your personal P/L.')}
          </Paragraph>
          <Button data-size="sm" variant="primary" onClick={() => navigate('/login')}>
            {t('common.signIn', 'Sign In')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('picks.tracker.title', 'Pick Tracker')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('picks.tracker.subtitle', 'Your personal performance across all tailed picks')}
        </Paragraph>
      </Stack>

      {/* Stats Cards */}
      {stats && (
        <div className={s.statsGrid}>
          <StatCard label={t('picks.tracker.totalTailed', 'Total Picks')} value={String(stats.totalTailed)} />
          <StatCard
            label={t('picks.tracker.record', 'Record')}
            value={`${stats.wins}W - ${stats.losses}L - ${stats.pushes}P`}
          />
          <StatCard label={t('picks.tracker.winRate', 'Win Rate')} value={`${(stats.winRate * 100).toFixed(0)}%`} />
          <StatCard
            label={t('picks.tracker.netUnits', 'Net Units')}
            value={`${stats.netUnits >= 0 ? '+' : ''}${stats.netUnits.toFixed(2)}u`}
            colorClass={stats.netUnits >= 0 ? s.statPositive : s.statNegative}
          />
          <StatCard
            label={t('picks.tracker.roi', 'ROI')}
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
            colorClass={stats.roi >= 0 ? s.statPositive : s.statNegative}
          />
          <StatCard label={t('picks.tracker.pending', 'Pending')} value={String(stats.pending)} />
        </div>
      )}

      {/* Bankroll Tracker */}
      <div className={s.bankrollSection}>
        <Textfield
          label={t('picks.tracker.startingBankroll', 'Starting Bankroll (units)')}
          type="number"
          value={bankrollInput}
          onChange={(e) => setBankrollInput(e.target.value)}
          className={s.bankrollInput}
          data-size="sm"
          placeholder="100"
        />
        {stats?.currentBankroll !== undefined && (
          <div className={s.bankrollResult}>
            {t('picks.tracker.currentBankroll', 'Current Bankroll')}: {stats.currentBankroll.toFixed(2)}u
          </div>
        )}
      </div>

      {/* Sport Breakdown */}
      {stats && stats.sportBreakdown.length > 0 && (
        <div className={s.breakdownSection}>
          <Heading level={3} data-size="xs" className={s.sectionHeader}>
            {t('picks.tracker.sportBreakdown', 'By Sport')}
          </Heading>
          <div className={s.breakdownGrid}>
            {stats.sportBreakdown.map((sport) => (
              <Card key={sport.sport} className={s.breakdownCard}>
                <div className={s.breakdownSport}>{sport.sport}</div>
                <div className={s.breakdownStats}>
                  <span>
                    {sport.wins}W-{sport.losses}L
                  </span>
                  <span>{(sport.winRate * 100).toFixed(0)}%</span>
                  <span className={sport.netUnits >= 0 ? s.plPositive : s.plNegative}>
                    {sport.netUnits >= 0 ? '+' : ''}
                    {sport.netUnits.toFixed(2)}u
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Heading level={3} data-size="xs" className={s.sectionHeader}>
        {t('picks.tracker.history', 'Pick History')}
      </Heading>
      <div className={s.filterRow}>
        <NativeSelect
          label={t('picks.feed.filterSport', 'Sport')}
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className={s.filterSelect}
          data-size="sm"
        >
          {SPORTS.map((sport) => (
            <option key={sport} value={sport}>
              {sport === 'All' ? t('common.all', 'All Sports') : sport}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          label={t('picks.feed.filterResult', 'Result')}
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className={s.filterSelect}
          data-size="sm"
        >
          {RESULTS.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? t('common.all', 'All Results') : r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Pick History */}
      {isLoading ? (
        <Paragraph>{t('common.loading', 'Loading...')}</Paragraph>
      ) : picks.length === 0 ? (
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>
            {t('picks.tracker.empty', "You haven't tailed any picks yet. Browse the pick feed to get started.")}
          </Paragraph>
          <Button data-size="sm" variant="secondary" onClick={() => navigate('/picks')}>
            {t('picks.tracker.browsePicks', 'Browse Picks')}
          </Button>
        </div>
      ) : (
        <div className={s.pickList}>
          {picks.map((pick) => (
            <PickRow key={pick.id} pick={pick} onUntail={handleUntail} />
          ))}
        </div>
      )}
    </div>
  );
}
