/**
 * Pick Moderation Queue
 * Admin view for reviewing flagged/reported picks with moderation actions.
 * Follows audit page pattern: DashboardPageHeader + FilterToolbar + DataTable + Drawer.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Paragraph,
  Spinner,
  DataTable,
  Drawer,
  DrawerSection,
  Stack,
  Badge,
  Tag,
  Textfield,
  PillDropdown,
  FilterToolbar,
  DashboardPageHeader,
  EmptyState,
  ErrorState,
  InboxIcon,
} from '@digipicks/ds';
import type { DataTableColumn, ActiveFilter } from '@digipicks/ds';
import { useModerationQueue, useModerationStats, usePickReports, useModeratePick } from '@digipicks/sdk';
import type { ModerationQueuePick, ModerationStatus, PickReport } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import { useT } from '@digipicks/i18n';
import styles from './pick-moderation.module.css';

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'hidden', label: 'Hidden' },
] as const;

function getStatusColor(status?: string): 'warning' | 'danger' | 'success' | 'info' | 'neutral' {
  switch (status) {
    case 'flagged':
      return 'warning';
    case 'under_review':
      return 'info';
    case 'rejected':
    case 'hidden':
      return 'danger';
    case 'approved':
      return 'success';
    default:
      return 'neutral';
  }
}

// ============================================================================
// Component
// ============================================================================

export default function PickModerationPage() {
  const t = useT();
  const { tenantId, userId } = useAuthBridge();

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedPick, setSelectedPick] = useState<ModerationQueuePick | null>(null);
  const [moderationNote, setModerationNote] = useState('');

  // Queries
  const { data: stats, isLoading: statsLoading } = useModerationStats({
    tenantId: tenantId!,
    callerId: userId!,
  });

  const { picks, isLoading: queueLoading } = useModerationQueue({
    tenantId: tenantId!,
    callerId: userId!,
    moderationStatus: statusFilter,
    limit: 50,
  });

  const { reports, isLoading: reportsLoading } = usePickReports({
    pickId: selectedPick?._id ?? '',
    callerId: userId!,
  });

  const { mutateAsync: moderate } = useModeratePick();

  // Handlers
  const handleModerate = useCallback(
    async (status: ModerationStatus) => {
      if (!selectedPick || !userId) return;
      await moderate({
        id: selectedPick._id,
        moderatedBy: userId,
        moderationStatus: status,
        moderationNote: moderationNote || undefined,
      });
      setSelectedPick(null);
      setModerationNote('');
    },
    [selectedPick, userId, moderate, moderationNote],
  );

  // Table columns
  const columns: DataTableColumn<ModerationQueuePick>[] = useMemo(
    () => [
      {
        key: 'event',
        header: 'Event',
        render: (row) => row.event,
      },
      {
        key: 'creator',
        header: 'Creator',
        render: (row) => row.creator?.displayName ?? row.creator?.name ?? row.creatorId.slice(0, 8),
      },
      {
        key: 'sport',
        header: 'Sport',
        render: (row) => <Tag>{row.sport}</Tag>,
      },
      {
        key: 'moderationStatus',
        header: 'Status',
        render: (row) => (
          <Badge data-color={getStatusColor(row.moderationStatus)}>{row.moderationStatus ?? 'clean'}</Badge>
        ),
      },
      {
        key: 'reportCount',
        header: 'Reports',
        render: (row) => row.reportCount ?? 0,
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <Button data-size="sm" variant="tertiary" onClick={() => setSelectedPick(row)}>
            Review
          </Button>
        ),
      },
    ],
    [],
  );

  // Active filters
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (statusFilter) {
      filters.push({
        id: 'status',
        label: STATUS_OPTIONS.find((s) => s.id === statusFilter)?.label ?? statusFilter,
        onRemove: () => setStatusFilter(undefined),
      });
    }
    return filters;
  }, [statusFilter]);

  if (!tenantId || !userId) {
    return <ErrorState message="Authentication required" />;
  }

  return (
    <div className={styles.page}>
      <DashboardPageHeader title="Pick Moderation" description="Review flagged and reported picks" />

      {/* Stats Summary */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.flagged}</span>
            <span className={styles.statLabel}>Flagged</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.underReview}</span>
            <span className={styles.statLabel}>Under Review</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.pendingReports}</span>
            <span className={styles.statLabel}>Pending Reports</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.rejected}</span>
            <span className={styles.statLabel}>Rejected</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.hidden}</span>
            <span className={styles.statLabel}>Hidden</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.approved}</span>
            <span className={styles.statLabel}>Approved</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterToolbar activeFilters={activeFilters}>
        <PillDropdown
          label="Status"
          options={STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
          value={statusFilter ?? 'all'}
          onChange={(val) => setStatusFilter(val === 'all' ? undefined : val)}
        />
      </FilterToolbar>

      {/* Table */}
      {queueLoading ? (
        <Spinner />
      ) : !picks || picks.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title="No picks to moderate"
          description="All clear — no flagged or reported picks at this time."
        />
      ) : (
        <DataTable columns={columns} data={picks} getRowKey={(row) => row._id} />
      )}

      {/* Detail Drawer */}
      {selectedPick && (
        <Drawer
          open={!!selectedPick}
          onClose={() => {
            setSelectedPick(null);
            setModerationNote('');
          }}
          title={`Review: ${selectedPick.event}`}
        >
          <div className={styles.drawerContent}>
            <DrawerSection title="Pick Details">
              <Stack>
                <Paragraph>
                  <strong>Creator:</strong> {selectedPick.creator?.displayName ?? selectedPick.creatorId}
                </Paragraph>
                <Paragraph>
                  <strong>Sport:</strong> {selectedPick.sport}
                </Paragraph>
                <Paragraph>
                  <strong>Selection:</strong> {selectedPick.selection}
                </Paragraph>
                <Paragraph>
                  <strong>Odds:</strong> {selectedPick.oddsAmerican} ({selectedPick.oddsDecimal})
                </Paragraph>
                <Paragraph>
                  <strong>Units:</strong> {selectedPick.units}
                </Paragraph>
                <Paragraph>
                  <strong>Confidence:</strong> {selectedPick.confidence}
                </Paragraph>
                <Paragraph>
                  <strong>Result:</strong> {selectedPick.result}
                </Paragraph>
                <Paragraph>
                  <strong>Reports:</strong> {selectedPick.reportCount ?? 0}
                </Paragraph>
                <Paragraph>
                  <strong>Current Status:</strong>{' '}
                  <Badge data-color={getStatusColor(selectedPick.moderationStatus)}>
                    {selectedPick.moderationStatus ?? 'clean'}
                  </Badge>
                </Paragraph>
                {selectedPick.moderationNote && (
                  <Paragraph>
                    <strong>Previous Note:</strong> {selectedPick.moderationNote}
                  </Paragraph>
                )}
              </Stack>
            </DrawerSection>

            <DrawerSection title={`Reports (${reports?.length ?? 0})`}>
              {reportsLoading ? (
                <Spinner />
              ) : !reports || reports.length === 0 ? (
                <Paragraph>No reports filed for this pick.</Paragraph>
              ) : (
                reports.map((report: PickReport) => (
                  <div key={report._id} className={styles.reportItem}>
                    <div className={styles.reportHeader}>
                      <Tag>{report.reason}</Tag>
                      <Badge data-color={report.status === 'pending' ? 'warning' : 'neutral'}>{report.status}</Badge>
                    </div>
                    <Paragraph>
                      {report.reporter?.displayName ?? report.reporter?.name ?? 'Unknown user'}
                      {report.details ? ` — ${report.details}` : ''}
                    </Paragraph>
                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-text-subtle)' }}>
                      {new Date(report.reportedAt).toLocaleString()}
                    </Paragraph>
                  </div>
                ))
              )}
            </DrawerSection>

            <DrawerSection title="Moderation Action">
              <Stack>
                <Textfield
                  label="Moderation note"
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                />
                <div className={styles.moderationActions}>
                  <Button data-color="success" onClick={() => handleModerate('approved')}>
                    Approve
                  </Button>
                  <Button data-color="danger" onClick={() => handleModerate('rejected')}>
                    Reject
                  </Button>
                  <Button data-color="warning" onClick={() => handleModerate('hidden')}>
                    Hide
                  </Button>
                  <Button variant="secondary" onClick={() => handleModerate('under_review')}>
                    Mark Under Review
                  </Button>
                  <Button variant="tertiary" onClick={() => handleModerate('clean')}>
                    Clear (Clean)
                  </Button>
                </div>
              </Stack>
            </DrawerSection>
          </div>
        </Drawer>
      )}
    </div>
  );
}
