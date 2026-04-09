/**
 * Picks List Page
 *
 * Displays all picks for the tenant with filtering and stats.
 * Creators can manage their picks and grade results.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digipicks/i18n';
import {
  Button,
  Heading,
  Paragraph,
  Card,
  Grid,
  Spinner,
  Textfield,
  StatusTag,
  EmptyState,
  DataTable,
  Tag,
  NativeSelect,
  PageContentLayout,
  PlusIcon,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import { usePicks, useCreatorStats, useDeletePick, useGradePick, type PickType } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './picks.module.css';

// ─────────────────────────── Constants ───────────────────────────

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF', 'Other'];
const RESULT_FILTERS = ['all', 'pending', 'won', 'lost', 'push', 'void'] as const;

// ─────────────────────────── Helpers ───────────────────────────

function resultColor(result: string): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (result) {
    case 'won':
      return 'success';
    case 'lost':
      return 'danger';
    case 'push':
      return 'warning';
    default:
      return 'neutral';
  }
}

// ─────────────────────────── Component ───────────────────────────

export function PicksPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuthBridge();

  const tenantId = user?.tenantId as any;
  const userId = user?.id;

  // Filters
  const [sportFilter, setSportFilter] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Data
  const { picks, isLoading } = usePicks(tenantId, {
    status: 'published',
    ...(sportFilter ? { sport: sportFilter } : {}),
    ...(resultFilter !== 'all' ? { result: resultFilter } : {}),
  });

  const { stats } = useCreatorStats(tenantId, userId);

  const filteredPicks = useMemo(() => {
    if (!search) return picks;
    const q = search.toLowerCase();
    return picks.filter(
      (p) =>
        p.event?.toLowerCase().includes(q) ||
        p.selection?.toLowerCase().includes(q) ||
        p.sport?.toLowerCase().includes(q),
    );
  }, [picks, search]);

  // Mutations
  const { mutateAsync: deletePick } = useDeletePick();
  const { mutateAsync: gradePick } = useGradePick();

  const handleGrade = async (pickId: string, result: 'won' | 'lost' | 'push' | 'void') => {
    if (!userId) return;
    await gradePick({ id: pickId, result, gradedBy: userId as any });
  };

  const handleDelete = async (pickId: string) => {
    if (!userId) return;
    await deletePick({ id: pickId, callerId: userId as any });
  };

  // Table columns
  const columns: DataTableColumn<PickType>[] = useMemo(
    () => [
      {
        id: 'event',
        header: t('picks.col.event', 'Event'),
        render: (pick) => (
          <div>
            <div style={{ fontWeight: 500 }}>{pick.event}</div>
            <div style={{ fontSize: 'var(--ds-size-2)', color: 'var(--ds-color-text-subtle)' }}>{pick.pickType}</div>
          </div>
        ),
      },
      {
        id: 'sport',
        header: t('picks.col.sport', 'Sport'),
        render: (pick) => (
          <Tag data-size="sm" data-color="neutral">
            {pick.sport}
          </Tag>
        ),
      },
      {
        id: 'selection',
        header: t('picks.col.selection', 'Selection'),
        accessor: 'selection',
      },
      {
        id: 'odds',
        header: t('picks.col.odds', 'Odds'),
        render: (pick) => (
          <span>
            <span style={{ fontWeight: 500 }}>{pick.oddsAmerican}</span>
            <span
              style={{
                fontSize: 'var(--ds-size-2)',
                color: 'var(--ds-color-text-subtle)',
                marginLeft: 'var(--ds-size-1)',
              }}
            >
              ({pick.oddsDecimal.toFixed(2)})
            </span>
          </span>
        ),
      },
      {
        id: 'units',
        header: t('picks.col.units', 'Units'),
        render: (pick) => <span style={{ fontWeight: 500 }}>{pick.units}u</span>,
      },
      {
        id: 'result',
        header: t('picks.col.result', 'Result'),
        render: (pick) =>
          pick.result === 'pending' ? (
            <NativeSelect
              data-size="sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleGrade(pick.id, e.target.value as 'won' | 'lost' | 'push' | 'void');
                }
              }}
            >
              <option value="">Grade</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="push">Push</option>
              <option value="void">Void</option>
            </NativeSelect>
          ) : (
            <StatusTag color={resultColor(pick.result)} size="sm">
              {pick.result.toUpperCase()}
            </StatusTag>
          ),
      },
      {
        id: 'actions',
        header: t('picks.col.actions', 'Actions'),
        align: 'right' as const,
        render: (pick) => (
          <div style={{ display: 'flex', gap: 'var(--ds-size-2)', justifyContent: 'flex-end' }}>
            <Button variant="tertiary" data-size="sm" onClick={() => navigate(`/picks/${pick.id}`)}>
              Edit
            </Button>
            <Button variant="tertiary" data-size="sm" data-color="danger" onClick={() => handleDelete(pick.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [navigate, userId],
  );

  if (isLoading) {
    return (
      <PageContentLayout>
        <div className={styles.page}>
          <Spinner data-size="lg" />
        </div>
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <Heading data-size="lg">{t('picks.title', 'My Picks')}</Heading>
            <Paragraph data-size="sm" style={{ color: 'var(--ds-color-text-subtle)' }}>
              {t('picks.subtitle', 'Manage your picks and track results')}
            </Paragraph>
          </div>
          <Button variant="primary" onClick={() => navigate('/picks/new')}>
            <PlusIcon />
            {t('picks.newPick', 'New Pick')}
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <Grid columns="4" gap="sm" style={{ marginBottom: 'var(--ds-size-6)' }}>
            <Card>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{stats.totalPicks}</div>
                <div className={styles.statLabel}>{t('picks.stats.total', 'Total Picks')}</div>
              </div>
            </Card>
            <Card>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: 'var(--ds-color-success-text-default)' }}>
                  {stats.winRate > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}
                </div>
                <div className={styles.statLabel}>{t('picks.stats.winRate', 'Win Rate')}</div>
              </div>
            </Card>
            <Card>
              <div className={styles.statCard}>
                <div
                  className={styles.statValue}
                  style={{
                    color:
                      stats.netUnits >= 0
                        ? 'var(--ds-color-success-text-default)'
                        : 'var(--ds-color-danger-text-default)',
                  }}
                >
                  {stats.netUnits >= 0 ? '+' : ''}
                  {stats.netUnits.toFixed(1)}u
                </div>
                <div className={styles.statLabel}>{t('picks.stats.netUnits', 'Net Units')}</div>
              </div>
            </Card>
            <Card>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {stats.roi > 0 ? `+${stats.roi}%` : stats.roi < 0 ? `${stats.roi}%` : '—'}
                </div>
                <div className={styles.statLabel}>{t('picks.stats.roi', 'ROI')}</div>
              </div>
            </Card>
          </Grid>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <Textfield
            placeholder={t('picks.search', 'Search picks...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-size="sm"
            style={{ width: '240px' }}
          />
          <NativeSelect data-size="sm" value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
            <option value="">{t('picks.allSports', 'All Sports')}</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
          <div style={{ display: 'flex', gap: 'var(--ds-size-1)' }}>
            {RESULT_FILTERS.map((r) => (
              <Button
                key={r}
                variant={resultFilter === r ? 'primary' : 'tertiary'}
                data-size="sm"
                onClick={() => setResultFilter(r)}
              >
                {r === 'all' ? t('picks.allResults', 'All') : r.charAt(0).toUpperCase() + r.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filteredPicks.length === 0 ? (
          <div className={styles.emptyState}>
            <EmptyState
              title={t('picks.empty.title', 'No picks yet')}
              description={t('picks.empty.description', 'Create your first pick to get started')}
            />
          </div>
        ) : (
          <Card>
            <DataTable<PickType> columns={columns} data={filteredPicks} getRowKey={(pick) => pick.id} size="sm" />
          </Card>
        )}
      </div>
    </PageContentLayout>
  );
}
