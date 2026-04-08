/**
 * TenantAuditLogPage
 *
 * Tenant admin overview of system-wide audit trail.
 * - Real-time Convex data via useTenantActivity
 * - Live-computed stats
 * - Entity type filter with proper i18n
 * - Detail drawer for individual events
 * - CSV/JSON export via useAuditExport
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Badge,
  DataTable,
  Drawer,
  DrawerSection,
  Tag,
  DashboardPageHeader,
  PageContentLayout,
  Stack,
  Grid,
  PillDropdown,
  FormField,
  useIsMobile,
  EmptyState,
  InboxIcon,
  LoadingState,
} from '@digilist-saas/ds';
import type { DataTableColumn } from '@digilist-saas/ds';
import { useT, useLocale } from '@digilist-saas/i18n';
import { getIntlLocale } from '@digilist-saas/shared/constants';
import { useTenantActivity, useAuditExport } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './audit-log.module.css';

type EntityTypeFilter = 'all' | 'booking' | 'resource' | 'user' | 'session' | 'conversation' | 'notification' | 'allocation' | 'category' | 'amenity' | 'favorite';

const ENTITY_TYPE_OPTIONS: { value: EntityTypeFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'auditLog.allTypes' },
  { value: 'booking', labelKey: 'auditLog.typeBooking' },
  { value: 'resource', labelKey: 'auditLog.typeResource' },
  { value: 'user', labelKey: 'auditLog.typeUser' },
  { value: 'session', labelKey: 'auditLog.typeSession' },
  { value: 'conversation', labelKey: 'auditLog.typeConversation' },
  { value: 'notification', labelKey: 'auditLog.typeNotification' },
  { value: 'allocation', labelKey: 'auditLog.typeAllocation' },
  { value: 'category', labelKey: 'auditLog.typeCategory' },
  { value: 'amenity', labelKey: 'auditLog.typeAmenity' },
  { value: 'favorite', labelKey: 'auditLog.typeFavorite' },
];

function getActionBadgeColor(action: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  if (action.includes('created') || action.includes('approved') || action.includes('confirmed')) return 'success';
  if (action.includes('deleted') || action.includes('rejected') || action.includes('hard_deleted') || action.includes('invalidated')) return 'danger';
  if (action.includes('updated') || action.includes('assigned') || action.includes('resolved')) return 'warning';
  if (action.includes('session') || action.includes('security') || action.includes('archived')) return 'info';
  return 'neutral';
}

function getEntityBadgeColor(entityType: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (entityType) {
    case 'booking': return 'info';
    case 'resource': return 'success';
    case 'session': return 'danger';
    case 'user': return 'warning';
    default: return 'neutral';
  }
}

interface AuditRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userName?: string;
  userEmail?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function TenantAuditLogPage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuthBridge();
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditRow | null>(null);
  const isMobile = useIsMobile();

  const tenantId = user?.tenantId as any;

  const { activities, isLoading } = useTenantActivity(tenantId, {
    entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    limit: 100,
  });

  const { triggerDownload, isReady: exportReady } = useAuditExport(tenantId, {
    entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    limit: 500,
  });

  const intlLocale = getIntlLocale(locale);
  const formatDateTime = useCallback((ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString(intlLocale) + ' ' +
      date.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' });
  }, [intlLocale]);

  const formatDateFull = useCallback((ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString(intlLocale, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) + ' ' + date.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [intlLocale]);

  // Compute live stats from real data
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const todayEntries = activities.filter(a => a.timestamp > oneDayAgo);
    const securityEntries = activities.filter(a =>
      a.entityType === 'session' || a.action.includes('session') || a.action.includes('security')
    );
    const warningActions = ['rejected', 'cancelled', 'hard_deleted'];
    const warnings = activities.filter(a => warningActions.some(w => a.action.includes(w)));
    const errors = activities.filter(a => a.action.includes('error') || a.action.includes('failed'));

    return {
      totalToday: todayEntries.length,
      total: activities.length,
      warnings: warnings.length,
      errors: errors.length,
      security: securityEntries.length,
    };
  }, [activities]);

  const rows: AuditRow[] = useMemo(() =>
    activities.map(a => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      userName: a.userName,
      userEmail: a.userEmail,
      timestamp: a.timestamp,
      metadata: a.metadata as Record<string, unknown> | undefined,
    })),
    [activities]
  );

  const auditColumns: DataTableColumn<AuditRow>[] = useMemo(
    () => [
      {
        id: 'timestamp',
        header: t('auditLog.timestamp'),
        render: (e) => (
          <Paragraph data-size="sm" className={styles.noWrapText}>
            {formatDateTime(e.timestamp)}
          </Paragraph>
        ),
      },
      {
        id: 'entityType',
        header: t('auditLog.entityType'),
        render: (e) => (
          <Tag data-color={getEntityBadgeColor(e.entityType)} data-size="sm">
            {t(`auditLog.type${e.entityType.charAt(0).toUpperCase() + e.entityType.slice(1)}`, { defaultValue: e.entityType })}
          </Tag>
        ),
      },
      {
        id: 'action',
        header: t('auditLog.action'),
        render: (e) => (
          <Badge data-color={getActionBadgeColor(e.action)}>
            {e.action}
          </Badge>
        ),
      },
      {
        id: 'entityId',
        header: t('auditLog.entityId'),
        render: (e) => (
          <Paragraph data-size="sm" className={styles.monoText}>
            {e.entityId.length > 12 ? `${e.entityId.slice(0, 12)}…` : e.entityId}
          </Paragraph>
        ),
      },
      {
        id: 'user',
        header: t('auditLog.user'),
        render: (e) => (
          <Paragraph data-size="sm" className={styles.headingNoMargin}>
            {e.userName || e.userEmail || t('auditLog.systemAction')}
          </Paragraph>
        ),
      },
    ],
    [t, formatDateTime]
  );

  const handleRowClick = useCallback((row: AuditRow) => {
    setSelectedEvent(row);
  }, []);

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('auditLog.title')}
        subtitle={t('auditLog.subtitle')}
        actions={
          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              className={styles.createButton}
              disabled={!exportReady}
              onClick={() => triggerDownload('csv')}
            >
              {t('auditLog.exportCsv')}
            </Button>
          </Stack>
        }
      />

      {/* Stats — live from real data */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'} gap="var(--ds-size-4)">
        <Card data-color="neutral" className={styles.statCard}>
          <Paragraph data-size="sm" className={styles.subtleText}>{t('auditLog.totalToday')}</Paragraph>
          <Heading level={2} data-size="xl" className={styles.headingNoMargin}>{stats.totalToday}</Heading>
        </Card>
        <Card data-color="neutral" className={styles.statCard}>
          <Paragraph data-size="sm" className={styles.subtleText}>{t('auditLog.warnings')}</Paragraph>
          <Heading level={2} data-size="xl" className={styles.warningHeading}>{stats.warnings}</Heading>
        </Card>
        <Card data-color="neutral" className={styles.statCard}>
          <Paragraph data-size="sm" className={styles.subtleText}>{t('auditLog.errors')}</Paragraph>
          <Heading level={2} data-size="xl" className={styles.dangerHeading}>{stats.errors}</Heading>
        </Card>
        <Card data-color="neutral" className={styles.statCard}>
          <Paragraph data-size="sm" className={styles.subtleText}>{t('auditLog.security')}</Paragraph>
          <Heading level={2} data-size="xl" className={styles.infoHeading}>{stats.security}</Heading>
        </Card>
      </Grid>

      {/* Filters */}
      <Card data-color="neutral" className={styles.statCard}>
        <Stack
          direction={isMobile ? 'vertical' : 'horizontal'}
          spacing="var(--ds-size-4)"
          align={isMobile ? 'stretch' : 'end'}
        >
          <Stack className={styles.flexOne}>
            <FormField label={t('auditLog.entityType')}>
              <PillDropdown
                label={t(ENTITY_TYPE_OPTIONS.find(o => o.value === entityTypeFilter)?.labelKey ?? 'auditLog.allTypes')}
                options={ENTITY_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
                value={entityTypeFilter}
                onChange={(v) => setEntityTypeFilter(v as EntityTypeFilter)}
                ariaLabel={t('auditLog.filterByType')}
              />
            </FormField>
          </Stack>
          <Paragraph data-size="sm" className={styles.filterCount}>
            {stats.total} {t('auditLog.totalEntries').toLowerCase()}
          </Paragraph>
        </Stack>
      </Card>

      {/* Events Table */}
      <Card data-color="neutral" className={styles.tableCard}>
        {isLoading ? (
          <LoadingState message={t('common.loading')} size="lg" />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('auditLog.noEvents')}
            icon={<InboxIcon />}
          />
        ) : (
          <DataTable<AuditRow>
            columns={auditColumns}
            data={rows}
            getRowKey={(row) => row.id}
            size="sm"
            className={styles.fullWidthTable}
            emptyMessage={t('auditLog.noEvents')}
            onRowClick={handleRowClick}
          />
        )}
      </Card>

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
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.action')}
                  </Paragraph>
                  <Badge data-color={getActionBadgeColor(selectedEvent.action)}>
                    {selectedEvent.action}
                  </Badge>
                </Stack>
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.entityType')}
                  </Paragraph>
                  <Tag data-color={getEntityBadgeColor(selectedEvent.entityType)} data-size="sm">
                    {t(`auditLog.type${selectedEvent.entityType.charAt(0).toUpperCase() + selectedEvent.entityType.slice(1)}`, { defaultValue: selectedEvent.entityType })}
                  </Tag>
                </Stack>
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.entityId')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerMonoText}>
                    {selectedEvent.entityId.length > 20 ? `${selectedEvent.entityId.slice(0, 20)}…` : selectedEvent.entityId}
                  </Paragraph>
                </Stack>
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.timestamp')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.headingNoMargin}>
                    {formatDateFull(selectedEvent.timestamp)}
                  </Paragraph>
                </Stack>
              </Stack>
            </DrawerSection>

            <DrawerSection title={t('auditLog.performedBy')}>
              <Stack spacing="var(--ds-size-2)">
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.user')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerLabelText}>
                    {selectedEvent.userName || selectedEvent.userEmail || t('auditLog.systemAction')}
                  </Paragraph>
                </Stack>
                {selectedEvent.userEmail && selectedEvent.userName && (
                  <Stack direction="horizontal" justify="between" align="center">
                    <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                      {t('backoffice2.emailLabel')}
                    </Paragraph>
                    <Paragraph data-size="sm" className={styles.drawerMonoText}>
                      {selectedEvent.userEmail}
                    </Paragraph>
                  </Stack>
                )}
              </Stack>
            </DrawerSection>

            <DrawerSection title={t('auditLog.systemInfo')}>
              <Stack spacing="var(--ds-size-2)">
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="sm" className={styles.drawerSubtleText}>
                    {t('auditLog.eventId')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.drawerMonoText}>
                    {selectedEvent.id.slice(0, 12)}…
                  </Paragraph>
                </Stack>
              </Stack>
            </DrawerSection>
          </>
        )}
      </Drawer>
    </PageContentLayout>
  );
}
