/**
 * Audit Log Page
 * Admin view for viewing system audit trail.
 * Mirrors the listings page design: DashboardPageHeader + FilterToolbar + DataTable.
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
  HeaderSearch,
  PillDropdown,
  FilterToolbar,
  DashboardPageHeader,
  EmptyState,
  ErrorState,
  InboxIcon,
  RevisionDiffView,
} from '@digipicks/ds';
import type { DataTableColumn, ActiveFilter } from '@digipicks/ds';
import { useTenantActivity, useUsers } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import { useT, useLocale } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import styles from './audit.module.css';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 25;

const ENTITY_TYPE_OPTIONS = [
  { id: 'all', labelKey: 'auditLog.allTypes' },
  { id: 'booking', labelKey: 'auditLog.typeBooking' },
  { id: 'resource', labelKey: 'auditLog.typeResource' },
  { id: 'user', labelKey: 'auditLog.typeUser' },
  { id: 'session', labelKey: 'auditLog.typeSession' },
  { id: 'conversation', labelKey: 'auditLog.typeConversation' },
  { id: 'notification', labelKey: 'auditLog.typeNotification' },
  { id: 'allocation', labelKey: 'auditLog.typeAllocation' },
  { id: 'category', labelKey: 'auditLog.typeCategory' },
  { id: 'amenity', labelKey: 'auditLog.typeAmenity' },
  { id: 'favorite', labelKey: 'auditLog.typeFavorite' },
] as const;

const ACTION_OPTIONS = [
  { id: 'all', labelKey: 'auditLog.actionAll' },
  { id: 'created', labelKey: 'auditLog.actionCreated' },
  { id: 'updated', labelKey: 'auditLog.actionUpdated' },
  { id: 'deleted', labelKey: 'auditLog.actionDeleted' },
  { id: 'approved', labelKey: 'auditLog.actionApproved' },
  { id: 'rejected', labelKey: 'auditLog.actionRejected' },
  { id: 'confirmed', labelKey: 'auditLog.actionConfirmed' },
  { id: 'cancelled', labelKey: 'auditLog.actionCancelled' },
  { id: 'archived', labelKey: 'auditLog.actionArchived' },
  { id: 'login', labelKey: 'auditLog.actionLogin' },
  { id: 'logout', labelKey: 'auditLog.actionLogout' },
] as const;

const SORT_OPTIONS = [
  { id: 'newest', labelKey: 'auditLog.sortNewest', field: 'timestamp', order: 'desc' as const },
  { id: 'oldest', labelKey: 'auditLog.sortOldest', field: 'timestamp', order: 'asc' as const },
  { id: 'action-asc', labelKey: 'auditLog.sortActionAsc', field: 'action', order: 'asc' as const },
  { id: 'type-asc', labelKey: 'auditLog.sortTypeAsc', field: 'entityType', order: 'asc' as const },
  { id: 'user-asc', labelKey: 'auditLog.sortUserAsc', field: 'userName', order: 'asc' as const },
];

// ============================================================================
// Helpers
// ============================================================================

function getActionBadgeColor(action: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  if (action.includes('created') || action.includes('approved') || action.includes('confirmed')) return 'success';
  if (action.includes('deleted') || action.includes('rejected') || action.includes('hard_deleted')) return 'danger';
  if (action.includes('updated') || action.includes('assigned') || action.includes('resolved')) return 'warning';
  if (action.includes('login') || action.includes('logout') || action.includes('session')) return 'info';
  return 'neutral';
}

function getEntityBadgeColor(entityType: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (entityType) {
    case 'booking':
      return 'info';
    case 'resource':
      return 'success';
    case 'session':
      return 'danger';
    case 'user':
      return 'warning';
    case 'conversation':
      return 'info';
    case 'notification':
      return 'neutral';
    case 'allocation':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Relative time using i18n keys from common namespace */
function formatRelativeTime(
  ts: number,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', { count: minutes });
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  if (days < 7) return t('common.daysAgo', { count: days });
  return new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** Build a human-readable description of the audit event using i18n */
const ACTION_VERB_KEYS: Record<string, string> = {
  created: 'auditLog.verbCreated',
  updated: 'auditLog.verbUpdated',
  deleted: 'auditLog.verbDeleted',
  approved: 'auditLog.verbApproved',
  rejected: 'auditLog.verbRejected',
  confirmed: 'auditLog.verbConfirmed',
  cancelled: 'auditLog.verbCancelled',
  archived: 'auditLog.verbArchived',
  login: 'auditLog.verbLogin',
  logout: 'auditLog.verbLogout',
  session_created: 'auditLog.verbSessionCreated',
  session_expired: 'auditLog.verbSessionExpired',
  assigned: 'auditLog.verbAssigned',
  resolved: 'auditLog.verbResolved',
  sent: 'auditLog.verbSent',
  read: 'auditLog.verbRead',
  toggled: 'auditLog.verbToggled',
  added: 'auditLog.verbAdded',
  removed: 'auditLog.verbRemoved',
};

const ENTITY_LABEL_KEYS: Record<string, string> = {
  booking: 'auditLog.entityBooking',
  resource: 'auditLog.entityResource',
  user: 'auditLog.entityUser',
  session: 'auditLog.entitySession',
  conversation: 'auditLog.entityConversation',
  notification: 'auditLog.entityNotification',
  allocation: 'auditLog.entityAllocation',
  category: 'auditLog.entityCategory',
  amenity: 'auditLog.entityAmenity',
  favorite: 'auditLog.entityFavorite',
};

function getEventDescription(
  action: string,
  entityType: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const actionKey = ACTION_VERB_KEYS[action];
  const entityKey = ENTITY_LABEL_KEYS[entityType];
  const actionLabel = actionKey ? t(actionKey) : action.replace(/_/g, ' ');
  const entityLabel = entityKey ? t(entityKey) : entityType;
  return `${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} ${actionLabel}`;
}

/** Count changed fields from metadata */
function getChangedFieldsCount(metadata?: Record<string, unknown>): number | null {
  if (!metadata) return null;
  const changedFields = metadata.changedFields as string[] | undefined;
  if (changedFields) return changedFields.length;
  if (metadata.before && metadata.after) {
    const before = metadata.before as Record<string, unknown>;
    const after = metadata.after as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    let count = 0;
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) count++;
    }
    return count;
  }
  return null;
}

// ============================================================================
// Row type
// ============================================================================

interface AuditRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Component
// ============================================================================

export function AuditPage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuthBridge();
  const tenantId = user?.tenantId as any;
  const intlLocale = getIntlLocale(locale);

  // State
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [sortId, setSortId] = useState('newest');
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditRow | null>(null);
  const [page, setPage] = useState(1);

  // User lookup
  const { data: usersData } = useUsers({ limit: 100 });
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    usersData?.data?.forEach((u: { id: string; name?: string; email?: string }) => {
      map.set(u.id, u.name || u.email || t('auditLog.unknownUser'));
    });
    return map;
  }, [usersData, t]);

  // Data fetching
  const { activities, isLoading, error } = useTenantActivity(tenantId, {
    entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
    limit: 500,
  });

  // Map to table rows
  const allRows: AuditRow[] = useMemo(
    () =>
      (activities ?? []).map((a) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        userName: a.userName,
        userEmail: a.userEmail,
        userId: a.userId ?? undefined,
        timestamp: a.timestamp,
        metadata: a.metadata as Record<string, unknown> | undefined,
      })),
    [activities],
  );

  // Action filter
  const actionFilteredRows = useMemo(() => {
    if (actionFilter === 'all') return allRows;
    return allRows.filter((r) => r.action.includes(actionFilter));
  }, [allRows, actionFilter]);

  // Search filter
  const searchedRows = useMemo(() => {
    if (!searchQuery) return actionFilteredRows;
    const q = searchQuery.toLowerCase();
    return actionFilteredRows.filter((row) => {
      const name = row.userName || row.userEmail || '';
      const desc = getEventDescription(row.action, row.entityType, t);
      return (
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.entityType.toLowerCase().includes(q)
      );
    });
  }, [actionFilteredRows, searchQuery]);

  // Sorting
  const sortedRows = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.id === sortId);
    if (!opt) return searchedRows;
    const sorted = [...searchedRows];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (opt.field === 'timestamp') {
        aVal = a.timestamp;
        bVal = b.timestamp;
      } else if (opt.field === 'action') {
        aVal = a.action.toLowerCase();
        bVal = b.action.toLowerCase();
      } else if (opt.field === 'entityType') {
        aVal = a.entityType.toLowerCase();
        bVal = b.entityType.toLowerCase();
      } else if (opt.field === 'userName') {
        aVal = (a.userName || a.userEmail || '').toLowerCase();
        bVal = (b.userName || b.userEmail || '').toLowerCase();
      }
      if (aVal < bVal) return opt.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return opt.order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [searchedRows, sortId]);

  const filteredRows = sortedRows;

  // Active filter tags
  const activeFilters = useMemo((): ActiveFilter[] => {
    const tags: ActiveFilter[] = [];
    if (entityTypeFilter !== 'all') {
      const opt = ENTITY_TYPE_OPTIONS.find((o) => o.id === entityTypeFilter);
      tags.push({ key: 'entityType', label: opt ? t(opt.labelKey) : entityTypeFilter });
    }
    if (actionFilter !== 'all') {
      const opt = ACTION_OPTIONS.find((o) => o.id === actionFilter);
      tags.push({ key: 'action', label: opt ? t(opt.labelKey) : actionFilter });
    }
    if (searchQuery) {
      tags.push({ key: 'search', label: `"${searchQuery}"` });
    }
    return tags;
  }, [entityTypeFilter, actionFilter, searchQuery, t]);

  const resetPage = useCallback(() => setPage(1), []);

  const handleRemoveFilter = useCallback(
    (key: string) => {
      if (key === 'entityType') {
        setEntityTypeFilter('all');
        resetPage();
      }
      if (key === 'action') {
        setActionFilter('all');
        resetPage();
      }
      if (key === 'search') {
        setSearchQuery('');
        setSearchValue('');
        resetPage();
      }
    },
    [resetPage],
  );

  const handleClearAll = useCallback(() => {
    setEntityTypeFilter('all');
    setActionFilter('all');
    setSearchQuery('');
    setSearchValue('');
    setSortId('newest');
    resetPage();
  }, [resetPage]);

  // Format helpers
  const formatDateTimeFull = useCallback(
    (ts: number) => {
      return new Date(ts).toLocaleDateString(intlLocale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      } as Intl.DateTimeFormatOptions);
    },
    [intlLocale],
  );

  // Dropdown options
  const entityTypeLabel = useMemo(() => {
    const opt = ENTITY_TYPE_OPTIONS.find((o) => o.id === entityTypeFilter);
    return opt ? t(opt.labelKey) : t('auditLog.allTypes');
  }, [entityTypeFilter, t]);

  const entityTypeDropdownOptions = useMemo(
    () => ENTITY_TYPE_OPTIONS.map((o) => ({ value: o.id, label: t(o.labelKey) })),
    [t],
  );

  const actionLabel = useMemo(() => {
    const opt = ACTION_OPTIONS.find((o) => o.id === actionFilter);
    return opt ? t(opt.labelKey) : t('auditLog.actionAll');
  }, [actionFilter, t]);

  const actionDropdownOptions = useMemo(() => ACTION_OPTIONS.map((o) => ({ value: o.id, label: t(o.labelKey) })), [t]);

  const currentSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.id === sortId);
    return opt ? t(opt.labelKey) : t('auditLog.sortNewest');
  }, [sortId, t]);

  const sortDropdownOptions = useMemo(() => SORT_OPTIONS.map((o) => ({ value: o.id, label: t(o.labelKey) })), []);

  // Table columns — optimized for useful info
  const columns: DataTableColumn<AuditRow>[] = useMemo(
    () => [
      {
        id: 'description',
        header: t('auditLog.details'),
        render: (row) => {
          const desc = getEventDescription(row.action, row.entityType, t);
          const changedCount = getChangedFieldsCount(row.metadata);
          return (
            <div>
              <Paragraph data-size="sm" className={styles.cellTitle}>
                {desc}
              </Paragraph>
              {changedCount !== null && changedCount > 0 && (
                <Paragraph data-size="xs" className={styles.cellSubtle}>
                  {t('auditLog.fieldChanged', { count: changedCount })}
                </Paragraph>
              )}
            </div>
          );
        },
      },
      {
        id: 'entityType',
        header: t('auditLog.entityType'),
        width: '120px',
        render: (row) => (
          <Tag data-color={getEntityBadgeColor(row.entityType)} data-size="sm">
            {t(`auditLog.type${row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1)}`, {
              defaultValue: row.entityType,
            })}
          </Tag>
        ),
      },
      {
        id: 'action',
        header: t('auditLog.action'),
        width: '140px',
        render: (row) => <Badge data-color={getActionBadgeColor(row.action)}>{row.action.replace(/_/g, ' ')}</Badge>,
      },
      {
        id: 'user',
        header: t('auditLog.user'),
        width: '180px',
        render: (row) => {
          const name = row.userName || userNameMap.get(row.userId ?? '') || row.userEmail;
          return (
            <div>
              <Paragraph data-size="sm" className={styles.cellDefault}>
                {name || t('auditLog.systemAction')}
              </Paragraph>
              {name && row.userEmail && row.userName && (
                <Paragraph data-size="xs" className={styles.cellSubtle}>
                  {row.userEmail}
                </Paragraph>
              )}
            </div>
          );
        },
      },
      {
        id: 'timestamp',
        header: t('auditLog.timestamp'),
        width: '130px',
        render: (row) => {
          const relative = formatRelativeTime(row.timestamp, intlLocale, t);
          const absolute = new Date(row.timestamp).toLocaleTimeString(intlLocale, {
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div>
              <Paragraph data-size="sm" className={styles.cellDefault}>
                {relative}
              </Paragraph>
              <Paragraph data-size="xs" className={styles.cellSubtle}>
                {absolute}
              </Paragraph>
            </div>
          );
        },
      },
    ],
    [t, intlLocale, userNameMap],
  );

  return (
    <Stack direction="vertical" className={styles.outerStack}>
      <DashboardPageHeader
        title={t('auditLog.title')}
        titleSize="md"
        count={filteredRows.length > 0 ? filteredRows.length : undefined}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAll}
        sticky
        level={1}
      >
        <FilterToolbar variant="flat" aria-label={t('auditLog.filterByType')}>
          <FilterToolbar.Start>
            <HeaderSearch
              placeholder={t('auditLog.filter') + '...'}
              value={searchValue}
              onSearchChange={(v) => setSearchValue(v)}
              onSearch={(v) => {
                setSearchQuery(v || '');
                resetPage();
              }}
              width="320px"
            />
          </FilterToolbar.Start>
          <FilterToolbar.Center>
            <PillDropdown
              label={entityTypeLabel}
              options={entityTypeDropdownOptions}
              value={entityTypeFilter}
              onChange={(v) => {
                setEntityTypeFilter(v);
                resetPage();
              }}
              size="md"
              ariaLabel={t('auditLog.entityType')}
            />
            <PillDropdown
              label={actionLabel}
              options={actionDropdownOptions}
              value={actionFilter}
              onChange={(v) => {
                setActionFilter(v);
                resetPage();
              }}
              size="md"
              ariaLabel={t('auditLog.action')}
            />
            <PillDropdown
              label={currentSortLabel}
              options={sortDropdownOptions}
              value={sortId}
              onChange={(v) => {
                setSortId(v);
                resetPage();
              }}
              size="md"
              ariaLabel={t('auditLog.sort')}
            />
          </FilterToolbar.Center>
          <FilterToolbar.End>
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              onClick={() => {
                const header = `${t('auditLog.csvTimestamp')},${t('auditLog.csvType')},${t('auditLog.csvAction')},${t('auditLog.csvDescription')},${t('auditLog.csvUser')},${t('auditLog.csvEmail')}\n`;
                const csv = filteredRows
                  .map(
                    (r) =>
                      `${new Date(r.timestamp).toISOString()},${r.entityType},${r.action},"${getEventDescription(r.action, r.entityType, t)}",${r.userName || ''},${r.userEmail || ''}`,
                  )
                  .join('\n');
                const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${t('auditLog.csvFilenamePrefix')}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className={styles.exportButton}
            >
              {t('auditLog.exportCsv')}
            </Button>
          </FilterToolbar.End>
        </FilterToolbar>
      </DashboardPageHeader>

      {/* Content */}
      <div className={styles.contentArea}>
        {error ? (
          <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
        ) : isLoading ? (
          <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : filteredRows.length === 0 ? (
          <EmptyState title={t('auditLog.noEvents')} icon={<InboxIcon />} />
        ) : (
          <DataTable<AuditRow>
            columns={columns}
            data={filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)}
            getRowKey={(row) => row.id}
            size="sm"
            className={styles.fullWidthTable}
            emptyMessage={t('auditLog.noEvents')}
            onRowClick={(row) => setSelectedEvent(row)}
            pagination={{
              page,
              pageSize: ITEMS_PER_PAGE,
              total: filteredRows.length,
            }}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={t('auditLog.eventDetails')}
        position="right"
        size="lg"
      >
        {selectedEvent && (
          <>
            <DrawerSection title={t('auditLog.overview')}>
              <Stack spacing="var(--ds-size-3)">
                <Paragraph data-size="lg" className={styles.drawerTitle}>
                  {getEventDescription(selectedEvent.action, selectedEvent.entityType, t)}
                </Paragraph>
                <Stack direction="horizontal" spacing="var(--ds-size-2)">
                  <Tag data-color={getEntityBadgeColor(selectedEvent.entityType)} data-size="sm">
                    {t(
                      `auditLog.type${selectedEvent.entityType.charAt(0).toUpperCase() + selectedEvent.entityType.slice(1)}`,
                      { defaultValue: selectedEvent.entityType },
                    )}
                  </Tag>
                  <Badge data-color={getActionBadgeColor(selectedEvent.action)}>
                    {selectedEvent.action.replace(/_/g, ' ')}
                  </Badge>
                </Stack>
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerLabel}>
                    {t('auditLog.timestamp')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerValue}>
                    {formatDateTimeFull(selectedEvent.timestamp)}
                  </Paragraph>
                </Stack>
              </Stack>
            </DrawerSection>

            <DrawerSection title={t('auditLog.performedBy')}>
              <Stack spacing="var(--ds-size-2)">
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerLabel}>
                    {t('auditLog.user')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerValueBold}>
                    {selectedEvent.userName ||
                      userNameMap.get(selectedEvent.userId ?? '') ||
                      t('auditLog.systemAction')}
                  </Paragraph>
                </Stack>
                {selectedEvent.userEmail && (
                  <Stack direction="horizontal" justify="between" align="center">
                    <Paragraph data-size="sm" className={styles.drawerLabel}>
                      {t('common.email')}
                    </Paragraph>
                    <Paragraph data-size="sm" className={styles.drawerValueMono}>
                      {selectedEvent.userEmail}
                    </Paragraph>
                  </Stack>
                )}
              </Stack>
            </DrawerSection>

            {/* Diff view for before/after metadata */}
            {selectedEvent.metadata?.before && selectedEvent.metadata?.after && (
              <DrawerSection title={t('auditLog.details')}>
                <RevisionDiffView
                  previousState={selectedEvent.metadata.before as Record<string, unknown>}
                  newState={selectedEvent.metadata.after as Record<string, unknown>}
                />
              </DrawerSection>
            )}

            {/* Changed fields list when no full diff available */}
            {selectedEvent.metadata?.changedFields && !selectedEvent.metadata?.before && (
              <DrawerSection title={t('auditLog.details')}>
                <Stack spacing="var(--ds-size-1)">
                  {(selectedEvent.metadata.changedFields as string[]).map((field) => (
                    <Paragraph key={field} data-size="sm" className={styles.drawerValueMono}>
                      {field}
                    </Paragraph>
                  ))}
                </Stack>
              </DrawerSection>
            )}

            <DrawerSection title={t('auditLog.systemInfo')}>
              <Stack spacing="var(--ds-size-2)">
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerLabel}>
                    {t('auditLog.eventId')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerValueMono}>
                    {selectedEvent.id}
                  </Paragraph>
                </Stack>
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerLabel}>
                    {t('auditLog.entityId')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerValueMono}>
                    {selectedEvent.entityId}
                  </Paragraph>
                </Stack>
              </Stack>
            </DrawerSection>
          </>
        )}
      </Drawer>
    </Stack>
  );
}
