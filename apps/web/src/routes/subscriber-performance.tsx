/**
 * SubscriberPerformancePage — Web App
 *
 * Personal results tracking across all followed creators.
 * Shows win/loss/push record, sport breakdown, creator breakdown,
 * time-period filtering, and optional ROI / net-units tracking.
 *
 * Route: /subscriber/performance
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Stack, NativeSelect, Textfield, StatusTag, Spinner } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useSubscriberDashboard } from '@digipicks/sdk';
import type { SubscriberDashboard, CreatorInsight } from '@digipicks/sdk';
import { useAuth, env } from '@digipicks/app-shell';
import s from './subscriber-performance.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
] as const;

const SPORTS_ALL = 'All';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trendLabel(trend: string): string {
  switch (trend) {
    case 'improving':
      return 'Improving';
    case 'declining':
      return 'Declining';
    default:
      return 'Stable';
  }
}

function trendColor(trend: string): 'success' | 'danger' | 'neutral' {
  switch (trend) {
    case 'improving':
      return 'success';
    case 'declining':
      return 'danger';
    default:
      return 'neutral';
  }
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
// Creator Insight Card
// ---------------------------------------------------------------------------

function CreatorInsightCard({ insight, t }: { insight: CreatorInsight; t: (key: string, fallback: string) => string }) {
  const pred = insight.predictions;
  const name = insight.creator?.displayName || insight.creator?.name || 'Unknown Creator';

  return (
    <Card className={s.creatorCard}>
      <div className={s.creatorHeader}>
        <Link to={`/creator/${insight.creatorId}`} className={s.creatorName}>
          {name}
        </Link>
        <StatusTag color={trendColor(pred.trend)} data-size="sm">
          {trendLabel(pred.trend)}
        </StatusTag>
      </div>

      <div className={s.creatorStats}>
        <div className={s.creatorStat}>
          <span className={s.creatorStatLabel}>{t('performance.winRate', 'Win Rate')}</span>
          <span className={s.creatorStatValue}>{(pred.overallWinRate * 100).toFixed(0)}%</span>
        </div>
        <div className={s.creatorStat}>
          <span className={s.creatorStatLabel}>{t('performance.recentWinRate', 'Recent')}</span>
          <span className={s.creatorStatValue}>{(pred.recentWinRate * 100).toFixed(0)}%</span>
        </div>
        <div className={s.creatorStat}>
          <span className={s.creatorStatLabel}>{t('performance.streak', 'Streak')}</span>
          <span className={s.creatorStatValue}>
            {pred.currentStreak.type !== 'none'
              ? `${pred.currentStreak.length}${pred.currentStreak.type === 'win' ? 'W' : 'L'}`
              : '-'}
          </span>
        </div>
        <div className={s.creatorStat}>
          <span className={s.creatorStatLabel}>{t('performance.picks', 'Picks')}</span>
          <span className={s.creatorStatValue}>{pred.sampleSize}</span>
        </div>
      </div>

      {pred.bestEdges.length > 0 && (
        <div className={s.creatorEdges}>
          <span className={s.edgesLabel}>{t('performance.bestEdges', 'Best Edges')}:</span>
          {pred.bestEdges.slice(0, 2).map((edge, i) => (
            <StatusTag key={i} color="neutral" data-size="sm">
              {edge.sport} {edge.pickType} ({(edge.winRate * 100).toFixed(0)}%)
            </StatusTag>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SubscriberPerformancePage() {
  const t = useT();
  const navigate = useNavigate();
  const auth = useAuth();
  const tenantId = env.tenantId as string | undefined;
  const userId = auth.user?.id;

  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState(SPORTS_ALL);
  const [bankrollInput, setBankrollInput] = useState('');

  const bankroll = bankrollInput ? parseFloat(bankrollInput) : undefined;

  const dashboard = useSubscriberDashboard(tenantId as any, userId, bankroll);

  const isLoading = dashboard === undefined && auth.isAuthenticated;

  // Derive available sports from the sport breakdown
  const availableSports = useMemo(() => {
    if (!dashboard?.personalStats?.sportBreakdown) return [];
    return dashboard.personalStats.sportBreakdown.map((sb) => sb.sport);
  }, [dashboard]);

  // Filter sport breakdown by selected sport
  const filteredSportBreakdown = useMemo(() => {
    if (!dashboard?.personalStats?.sportBreakdown) return [];
    if (sportFilter === SPORTS_ALL) return dashboard.personalStats.sportBreakdown;
    return dashboard.personalStats.sportBreakdown.filter((sb) => sb.sport === sportFilter);
  }, [dashboard, sportFilter]);

  // Aggregate filtered stats when a sport is selected
  const displayStats = useMemo(() => {
    if (!dashboard?.personalStats) return null;
    const ps = dashboard.personalStats;

    if (sportFilter === SPORTS_ALL) return ps;

    // When filtering by sport, use sport breakdown stats
    const sportData = ps.sportBreakdown.find((sb) => sb.sport === sportFilter);
    if (!sportData) return ps;

    const total = sportData.wins + sportData.losses + (sportData.picks - sportData.wins - sportData.losses);
    return {
      ...ps,
      totalTailed: sportData.picks,
      wins: sportData.wins,
      losses: sportData.losses,
      pushes: sportData.picks - sportData.wins - sportData.losses,
      winRate: sportData.winRate,
      netUnits: sportData.netUnits,
      roi: total > 0 ? (sportData.netUnits / total) * 100 : 0,
    };
  }, [dashboard, sportFilter]);

  // Not logged in
  if (!auth.isAuthenticated) {
    return (
      <div className={s.pageContainer}>
        <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
          <Heading level={1} data-size="lg" className={s.title}>
            {t('performance.title', 'My Performance')}
          </Heading>
        </Stack>
        <div className={s.loginPrompt}>
          <Paragraph className={s.loginPromptText}>
            {t('performance.loginPrompt', 'Sign in to see your personal performance across all followed creators.')}
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
          {t('performance.title', 'My Performance')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('performance.subtitle', 'Track your results across all followed creators')}
        </Paragraph>
      </Stack>

      {/* Filters */}
      <div className={s.filterRow}>
        <NativeSelect
          label={t('performance.filterSport', 'Sport')}
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className={s.filterSelect}
          data-size="sm"
        >
          <option value={SPORTS_ALL}>{t('common.allSports', 'All Sports')}</option>
          {availableSports.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          label={t('performance.filterPeriod', 'Time Period')}
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className={s.filterSelect}
          data-size="sm"
        >
          {TIME_PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {t(`performance.period.${p.value}`, p.label)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={s.loadingState}>
          <Spinner />
          <Paragraph>{t('common.loading', 'Loading...')}</Paragraph>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayStats && displayStats.totalTailed === 0 && (
        <div className={s.emptyState}>
          <Heading level={2} data-size="sm" className={s.emptyTitle}>
            {t('performance.emptyTitle', 'No picks yet')}
          </Heading>
          <Paragraph className={s.emptyText}>
            {t(
              'performance.emptyDesc',
              'Subscribe to creators and tail their picks to start tracking your performance.',
            )}
          </Paragraph>
          <div className={s.emptyActions}>
            <Button data-size="sm" variant="primary" onClick={() => navigate('/creators')}>
              {t('performance.browseCreators', 'Browse Creators')}
            </Button>
            <Button data-size="sm" variant="secondary" onClick={() => navigate('/picks')}>
              {t('performance.browsePicks', 'Browse Picks')}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {displayStats && displayStats.totalTailed > 0 && (
        <>
          <div className={s.statsGrid}>
            <StatCard label={t('performance.totalPicks', 'Total Picks')} value={String(displayStats.totalTailed)} />
            <StatCard
              label={t('performance.record', 'Record')}
              value={`${displayStats.wins}W - ${displayStats.losses}L - ${displayStats.pushes}P`}
            />
            <StatCard
              label={t('performance.winRate', 'Win Rate')}
              value={`${(displayStats.winRate * 100).toFixed(0)}%`}
            />
            <StatCard
              label={t('performance.netUnits', 'Net Units')}
              value={`${displayStats.netUnits >= 0 ? '+' : ''}${displayStats.netUnits.toFixed(2)}u`}
              colorClass={displayStats.netUnits >= 0 ? s.statPositive : s.statNegative}
            />
            <StatCard
              label={t('performance.roi', 'ROI')}
              value={`${displayStats.roi >= 0 ? '+' : ''}${displayStats.roi.toFixed(1)}%`}
              colorClass={displayStats.roi >= 0 ? s.statPositive : s.statNegative}
            />
            <StatCard label={t('performance.pending', 'Pending')} value={String(displayStats.pending)} />
          </div>

          {/* Bankroll Tracker (optional ROI feature) */}
          <div className={s.bankrollSection}>
            <Textfield
              label={t('performance.startingBankroll', 'Starting Bankroll (units)')}
              type="number"
              value={bankrollInput}
              onChange={(e) => setBankrollInput(e.target.value)}
              className={s.bankrollInput}
              data-size="sm"
              placeholder="100"
            />
            {displayStats.currentBankroll !== undefined && (
              <div className={s.bankrollResult}>
                {t('performance.currentBankroll', 'Current Bankroll')}: {displayStats.currentBankroll.toFixed(2)}u
              </div>
            )}
          </div>

          {/* Sport Breakdown */}
          {filteredSportBreakdown.length > 0 && (
            <div className={s.section}>
              <Heading level={2} data-size="xs" className={s.sectionHeader}>
                {t('performance.bySport', 'By Sport')}
              </Heading>
              <div className={s.breakdownGrid}>
                {filteredSportBreakdown.map((sport) => (
                  <Card key={sport.sport} className={s.breakdownCard}>
                    <div className={s.breakdownSport}>{sport.sport}</div>
                    <div className={s.breakdownStats}>
                      <span>
                        {sport.picks} {t('performance.picks', 'picks')}
                      </span>
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

          {/* Creator Breakdown */}
          {dashboard?.creatorInsights && dashboard.creatorInsights.length > 0 && (
            <div className={s.section}>
              <Heading level={2} data-size="xs" className={s.sectionHeader}>
                {t('performance.byCreator', 'By Creator')}
              </Heading>
              <div className={s.creatorGrid}>
                {dashboard.creatorInsights.map((insight) => (
                  <CreatorInsightCard key={insight.creatorId} insight={insight} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* Bankroll Insights (if provided) */}
          {dashboard?.bankrollInsights && (
            <div className={s.section}>
              <Heading level={2} data-size="xs" className={s.sectionHeader}>
                {t('performance.bankrollInsights', 'Bankroll Insights')}
              </Heading>
              <div className={s.insightsGrid}>
                <Card className={s.insightCard}>
                  <div className={s.insightLabel}>{t('performance.maxDrawdown', 'Max Drawdown')}</div>
                  <div className={s.insightValue}>
                    {dashboard.bankrollInsights.riskMetrics.maxDrawdownPercent.toFixed(1)}%
                  </div>
                </Card>
                <Card className={s.insightCard}>
                  <div className={s.insightLabel}>{t('performance.sharpeRatio', 'Sharpe Ratio')}</div>
                  <div className={s.insightValue}>{dashboard.bankrollInsights.riskMetrics.sharpeRatio.toFixed(2)}</div>
                </Card>
                {dashboard.bankrollInsights.projection.next50PicksExpected !== undefined && (
                  <Card className={s.insightCard}>
                    <div className={s.insightLabel}>{t('performance.projected50', 'Projected (50 picks)')}</div>
                    <div
                      className={`${s.insightValue} ${dashboard.bankrollInsights.projection.next50PicksExpected >= 0 ? s.statPositive : s.statNegative}`}
                    >
                      {dashboard.bankrollInsights.projection.next50PicksExpected >= 0 ? '+' : ''}
                      {dashboard.bankrollInsights.projection.next50PicksExpected.toFixed(2)}u
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
