/**
 * Billing Page — SaaS Admin
 *
 * Platform billing overview with revenue stats, subscription summary,
 * and transaction history. Follows backoffice dashboard + list pattern.
 */

import { useMemo } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Tag,
  StatCard,
  DataTable,
  Grid,
  Stack,
  EmptyState,
  DashboardPageHeader,
  PageContentLayout,
  CalendarIcon,
  CheckCircleIcon,
  useIsMobile,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import styles from './billing.module.css';

interface TransactionRow {
  id: string;
  tenant: string;
  type: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

const STATUS_COLOR = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
} as const;

export function BillingPage() {
  const t = useT();
  const isMobile = useIsMobile();

  // Live data: use tenant data as billing proxy until billing component has platform-level queries
  const platformStats = useQuery(api.domain.platformAdmin.platformStats);
  const rawTenants = useQuery(api.domain.tenantOnboarding.listAllTenants, {});

  const isLoading = rawTenants === undefined;

  // Generate transaction rows from tenants (each tenant = 1 monthly subscription)
  const transactions: TransactionRow[] = (rawTenants ?? []).map((t: any) => ({
    id: t.id,
    tenant: t.name,
    type: t.plan || 'Starter',
    amount: t.plan === 'Enterprise' ? '12 500 NOK' : t.plan === 'Professional' ? '6 000 NOK' : '1 500 NOK',
    status: (t.status === 'active' ? 'paid' : 'pending') as 'paid' | 'pending' | 'overdue',
    date: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '\u2013',
  }));

  const columns: DataTableColumn<TransactionRow>[] = useMemo(
    () => [
      {
        id: 'tenant',
        header: t('saasAdmin.billing.columnTenant'),
        sortable: true,
        render: (row) => (
          <Paragraph data-size="sm" className={styles.tenantName}>
            {row.tenant}
          </Paragraph>
        ),
      },
      {
        id: 'type',
        header: t('saasAdmin.billing.columnType'),
        width: '140px',
        render: (row) => <Paragraph data-size="sm">{row.type}</Paragraph>,
      },
      {
        id: 'amount',
        header: t('saasAdmin.billing.columnAmount'),
        width: '140px',
        render: (row) => (
          <Paragraph data-size="sm" className={styles.amount}>
            {row.amount}
          </Paragraph>
        ),
      },
      {
        id: 'status',
        header: t('saasAdmin.billing.columnStatus'),
        width: '120px',
        render: (row) => (
          <Tag data-size="sm" data-color={STATUS_COLOR[row.status] ?? 'neutral'}>
            {row.status}
          </Tag>
        ),
      },
      {
        id: 'date',
        header: t('saasAdmin.billing.columnDate'),
        width: '140px',
        sortable: true,
        render: (row) => <Paragraph data-size="sm">{row.date}</Paragraph>,
      },
    ],
    [t],
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader subtitle={t('saasAdmin.billing.subtitle')} />

      {/* Revenue stats */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
        <StatCard
          title={t('saasAdmin.billing.mrr')}
          value={
            transactions
              .reduce((sum, t) => {
                const num = parseInt(t.amount.replace(/\s/g, '').replace('NOK', ''));
                return sum + (isNaN(num) ? 0 : num);
              }, 0)
              .toLocaleString('nb-NO') + ' NOK'
          }
          description={t('saasAdmin.billing.mrrDesc')}
          color="var(--ds-color-success-text-default)"
          icon={<CalendarIcon />}
        />
        <StatCard
          title={t('saasAdmin.billing.activeSubscriptions')}
          value={platformStats?.tenants.active ?? 0}
          description={t('saasAdmin.billing.activeSubsDesc')}
          icon={<CheckCircleIcon />}
        />
        <StatCard
          title={t('saasAdmin.billing.pendingInvoices')}
          value={transactions.filter((t) => t.status === 'pending').length}
          description={t('saasAdmin.billing.pendingDesc')}
          color="var(--ds-color-warning-text-default)"
          icon={<CalendarIcon />}
        />
      </Grid>

      {/* Transaction history */}
      <Card data-color="neutral">
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Heading level={2} data-size="sm">
            {t('saasAdmin.billing.recentTransactions')}
          </Heading>

          {transactions.length === 0 && !isLoading ? (
            <EmptyState title={t('saasAdmin.billing.emptyTitle')} description={t('saasAdmin.billing.emptyDesc')} />
          ) : (
            <DataTable<TransactionRow> columns={columns} data={transactions} getRowKey={(row) => row.id} size="sm" />
          )}
        </Stack>
      </Card>
    </PageContentLayout>
  );
}
