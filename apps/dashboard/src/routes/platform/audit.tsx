/**
 * Audit Page — SaaS Admin
 *
 * Platform-wide audit log with search, filters, and data table.
 * Follows backoffice list page pattern.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Paragraph,
  Tag,
  DataTable,
  HeaderSearch,
  Stack,
  EmptyState,
  FilterToolbar,
  DashboardPageHeader,
  PageContentLayout,
} from '@digilist-saas/ds';
import type { DataTableColumn } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import styles from './audit.module.css';

interface AuditRow {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  tenant: string;
  details: string;
}

const ACTION_COLOR = {
  create: 'success',
  enable: 'success',
  update: 'info',
  delete: 'danger',
  disable: 'warning',
  invoice: 'neutral',
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  approved: 'success',
  rejected: 'danger',
  submitted: 'warning',
} as const;

type TagColor = 'success' | 'info' | 'danger' | 'warning' | 'neutral';

function getActionColor(action: string): TagColor {
  const verb = action.split('.').pop() || action;
  return (ACTION_COLOR as Record<string, TagColor>)[verb] ?? 'neutral';
}

export function AuditPage() {
  const t = useT();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Live data from Convex — platform-wide audit feed
  const rawEvents = useQuery(api.domain.platformAdmin.recentActivity, { limit: 100 });
  const isLoading = rawEvents === undefined;

  // Transform to AuditRow format
  const events: AuditRow[] = (rawEvents ?? []).map((e: any) => ({
    id: e.id,
    timestamp: e.timestamp
      ? new Date(e.timestamp).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })
      : '\u2013',
    actor: e.actorId || 'System',
    action: e.action || '\u2013',
    resource: e.entityId ? `${e.entityType}:${e.entityId.slice(-6)}` : e.entityType || '\u2013',
    tenant: e.tenantName || '\u2013',
    details: typeof e.details === 'object' ? JSON.stringify(e.details) : String(e.details || '\u2013'),
  }));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        e.tenant.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleSearch = useCallback((value: string) => setSearchQuery(value || ''), []);

  const columns: DataTableColumn<AuditRow>[] = useMemo(
    () => [
      {
        id: 'timestamp',
        header: t('saasAdmin.audit.columnTimestamp'),
        width: '160px',
        sortable: true,
        render: (row) => (
          <Paragraph data-size="xs" className={styles.timestamp}>{row.timestamp}</Paragraph>
        ),
      },
      {
        id: 'actor',
        header: t('saasAdmin.audit.columnActor'),
        width: '160px',
        render: (row) => <Paragraph data-size="sm">{row.actor}</Paragraph>,
      },
      {
        id: 'action',
        header: t('saasAdmin.audit.columnAction'),
        width: '160px',
        render: (row) => (
          <Tag data-size="sm" data-color={getActionColor(row.action)}>
            {row.action}
          </Tag>
        ),
      },
      {
        id: 'resource',
        header: t('saasAdmin.audit.columnResource'),
        render: (row) => <Paragraph data-size="sm">{row.resource}</Paragraph>,
      },
      {
        id: 'tenant',
        header: t('saasAdmin.audit.columnTenant'),
        width: '120px',
        render: (row) => <Paragraph data-size="sm" data-color="subtle">{row.tenant}</Paragraph>,
      },
      {
        id: 'details',
        header: t('saasAdmin.audit.columnDetails'),
        hideOnMobile: true,
        render: (row) => <Paragraph data-size="xs" data-color="subtle">{row.details}</Paragraph>,
      },
    ],
    [t],
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        subtitle={t('saasAdmin.audit.subtitle')}
        count={filtered.length}
        sticky
      >
        <FilterToolbar variant="flat" aria-label={t('saasAdmin.audit.filterToolbar')}>
          <FilterToolbar.Center>
            <HeaderSearch
              placeholder={t('saasAdmin.audit.searchPlaceholder')}
              value={searchValue}
              onSearchChange={handleSearchChange}
              onSearch={handleSearch}
              width="350px"
            />
          </FilterToolbar.Center>
        </FilterToolbar>
      </DashboardPageHeader>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <Stack direction="horizontal" justify="center" align="center" className={styles.loadingWrapper}>
            <Paragraph data-size="sm">{t('saasAdmin.audit.loading')}</Paragraph>
          </Stack>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('saasAdmin.audit.emptyTitle')}
            description={searchQuery ? t('common.noSearchResults') : t('saasAdmin.audit.emptyDesc')}
          />
        ) : (
          <DataTable<AuditRow>
            columns={columns}
            data={filtered}
            getRowKey={(row) => row.id}
            size="sm"
          />
        )}
      </div>
    </PageContentLayout>
  );
}
