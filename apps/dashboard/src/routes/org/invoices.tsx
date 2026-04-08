/**
 * OrganizationInvoicesPage
 *
 * Organization invoices list for Minside app
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Paragraph,
  Button,
  Spinner,
  DataTable,
  StatusBadge,
  Stack,
  DashboardPageHeader,
  PageContentLayout,
  useIsMobile,
} from '@digilist-saas/ds';
import type { DataTableColumn, StatusBadgeConfig, BadgeColor } from '@digilist-saas/ds';
import { useOrgInvoices, useDownloadOrgInvoice, type OrgInvoice } from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import { useT, useLocale } from '@digilist-saas/i18n';
import { getIntlLocale } from '@digilist-saas/shared/constants';
import { useAccountContext } from '@digilist-saas/app-shell';
import type { InvoiceStatus } from '@digilist-saas/shared/types';
import s from './Invoices.module.css';

function useInvoiceStatusConfig(): Record<string, StatusBadgeConfig> {
  const t = useT();
  return {
    paid: { color: 'success' as BadgeColor, label: t('invoice.paid') },
    sent: { color: 'info' as BadgeColor, label: t('invoice.sent') },
    overdue: { color: 'danger' as BadgeColor, label: t('invoice.overdue') },
    draft: { color: 'neutral' as BadgeColor, label: t('invoice.draft') },
    cancelled: { color: 'neutral' as BadgeColor, label: t('invoice.cancelled') },
  };
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = useInvoiceStatusConfig();
  return <StatusBadge status={status} config={config} />;
}

export function OrganizationInvoicesPage() {
  const t = useT();
  const { locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>(undefined);
  const isMobile = useIsMobile();
  const accountCtx = useAccountContext();
  const orgId = accountCtx?.selectedOrganization?.id as Id<"organizations"> | undefined;

  const { data: invoicesData, isLoading } = useOrgInvoices(orgId,
    statusFilter ? { status: statusFilter } : undefined
  );
  const downloadInvoice = useDownloadOrgInvoice();
  
  const invoices = invoicesData?.data ?? [];

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(getIntlLocale(locale)) + ' kr';
  };

  const handleDownload = (invoiceId: string, _invoiceNumber: string) => {
    downloadInvoice.mutate(invoiceId);
  };

  const invoiceColumns: DataTableColumn<OrgInvoice>[] = useMemo(
    () => [
      {
        id: 'invoiceNumber',
        header: t('billing.invoiceNumber'),
        render: (inv) => <span className={s.invoiceNumber}>{inv.invoiceNumber}</span>,
      },
      { id: 'dueDate', header: t('billing.dueDate'), render: (inv) => inv.dueDate },
      { id: 'amount', header: t('common.amount'), render: (inv) => formatCurrency(inv.totalAmount) },
      {
        id: 'status',
        header: t('common.status'),
        render: (inv) => <InvoiceStatusBadge status={inv.status as string} />,
      },
      {
        id: 'actions',
        header: t('common.actions'),
        render: (inv) => (
          <Button
            type="button"
            variant="tertiary"
            data-size="sm"
            onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
          >
            {t('common.download')}
          </Button>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('org.invoices')}
        backHref="/org"
        backLabel={t('org.backToDashboard')}
      />

      {/* Filters */}
      <Stack direction="horizontal" spacing="var(--ds-size-2)" className={s.filterScroll}>
        {(['all', 'paid', 'sent', 'overdue'] as const).map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={(filter === 'all' && !statusFilter) || statusFilter === filter ? 'primary' : 'tertiary'}
            data-size="sm"
            onClick={() => setStatusFilter(filter === 'all' ? undefined : filter as InvoiceStatus)}
            className={s.filterButton}
          >
            {filter === 'all' ? t('bookings.all') : t(`invoice.${filter}`)}
          </Button>
        ))}
      </Stack>

      {/* Invoices List */}
      <Card className={s.tableCard}>
        {isLoading ? (
          <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : invoices.length === 0 ? (
          <div className={s.emptyState}>
            <Paragraph className={s.emptyText}>
              {t('org.noInvoices')}
            </Paragraph>
          </div>
        ) : isMobile ? (
          <Stack direction="vertical">
            {invoices.map((invoice: OrgInvoice) => (
              <div
                key={invoice.id}
                className={s.mobileRow}
              >
                <Stack direction="horizontal" justify="between" className={s.mobileRowHeader}>
                  <Paragraph data-size="sm" className={s.mobileRowTitle}>
                    {invoice.invoiceNumber}
                  </Paragraph>
                  <InvoiceStatusBadge status={invoice.status as string} />
                </Stack>
                <Paragraph data-size="xs" className={s.mobileRowMeta}>
                  {t('billing.dueDate')}: {invoice.dueDate}
                </Paragraph>
                <Stack direction="horizontal" justify="between" align="center" className={s.mobileRowFooter}>
                  <Paragraph data-size="md" className={s.mobileRowPrice}>
                    {formatCurrency(invoice.totalAmount)}
                  </Paragraph>
                  <Button
                    type="button"
                    variant="tertiary"
                    data-size="sm"
                    onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                    className={s.downloadButton}
                  >
                    {t('common.download')}
                  </Button>
                </Stack>
              </div>
            ))}
          </Stack>
        ) : (
          <DataTable<OrgInvoice>
            columns={invoiceColumns}
            data={invoices}
            getRowKey={(row) => row.id}
            size="sm"
            className={s.fullWidth}
            emptyMessage={t('billing.noInvoices')}
          />
        )}
      </Card>
    </PageContentLayout>
  );
}
