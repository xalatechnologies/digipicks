/**
 * UserBillingPage
 *
 * User billing dashboard for backoffice unified app
 * - 4 stat cards (total paid, outstanding, booking count, pending invoices)
 * - Invoice list with PillTabs + badge counts
 * - Richer DataTable columns (reference, description, date, amount, status, actions)
 * - Mobile-responsive Card/DataTable layout
 * - Click-to-navigate to booking detail
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './Billing.module.css';
import {
  Card,
  Paragraph,
  Button,
  Spinner,
  DataTable,
  ErrorState,
  StatusBadge,
  StatCard,
  Stack,
  Grid,
  PillTabs,
  EmptyState,
  InboxIcon,
  CreditCardIcon,
  ClockIcon,
  CalendarIcon,
  FileTextIcon,
  DownloadIcon,
  DashboardPageHeader,
  PageContentLayout,
  useIsMobile,
} from '@digipicks/ds';
import type { StatusBadgeConfig, BadgeColor } from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import {
  useBillingSummary,
  useInvoices,
  usePendingPaymentsCount,
  useDownloadInvoice,
  formatDate,
  type Invoice,
} from '@digipicks/sdk';
import { useT, useLocale } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import { useAuth } from '@digipicks/app-shell';
import type { Id } from '@digipicks/sdk';
import type { InvoiceStatus } from '@digipicks/shared/types';

function useInvoiceStatusConfig(): Record<string, StatusBadgeConfig> {
  const t = useT();
  return {
    paid: { color: 'success' as BadgeColor, label: t('invoice.paid') },
    sent: { color: 'info' as BadgeColor, label: t('invoice.sent') },
    overdue: { color: 'danger' as BadgeColor, label: t('invoice.overdue') },
    draft: { color: 'neutral' as BadgeColor, label: t('invoice.draft') },
    cancelled: { color: 'neutral' as BadgeColor, label: t('invoice.cancelled') },
    credited: { color: 'neutral' as BadgeColor, label: t('invoice.credited', 'Kreditert') },
  };
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = useInvoiceStatusConfig();
  return <StatusBadge status={status} config={config} />;
}

export function UserBillingPage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id as Id<'users'> | undefined;
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>(undefined);
  const isMobile = useIsMobile();

  // Fetch billing data
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useBillingSummary(userId);
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useInvoices(userId, statusFilter ? { status: statusFilter } : undefined);
  const { data: pendingCountData } = usePendingPaymentsCount(userId);
  const downloadInvoice = useDownloadInvoice();

  // Fetch all invoices (unfiltered) for counts
  const { data: allInvoicesData } = useInvoices(userId);
  const { data: paidInvoicesData } = useInvoices(userId, { status: 'paid' as InvoiceStatus });
  const { data: sentInvoicesData } = useInvoices(userId, { status: 'sent' as InvoiceStatus });
  const { data: overdueInvoicesData } = useInvoices(userId, { status: 'overdue' as InvoiceStatus });

  const summary = summaryData?.data;
  const invoices = invoicesData?.data ?? [];
  const pendingCount = pendingCountData?.data?.count ?? 0;

  // Tab badge counts
  const tabCounts = useMemo(
    () => ({
      all: allInvoicesData?.data?.length ?? 0,
      paid: paidInvoicesData?.data?.length ?? 0,
      sent: sentInvoicesData?.data?.length ?? 0,
      overdue: overdueInvoicesData?.data?.length ?? 0,
    }),
    [allInvoicesData, paidInvoicesData, sentInvoicesData, overdueInvoicesData],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      downloadInvoice.mutate(id);
    },
    [downloadInvoice],
  );

  const handleInvoiceClick = useCallback(
    (invoice: Invoice) => {
      if (invoice.bookingId) {
        navigate(`/my/bookings/${invoice.bookingId}`);
      }
    },
    [navigate],
  );

  const fmtCurrency = useCallback(
    (amount: number) => {
      return amount.toLocaleString(getIntlLocale(locale)) + ' kr';
    },
    [locale],
  );

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'month':
        return t('billing.periodMonth', 'Siste 30 dager');
      case 'year':
        return t('billing.periodYear', 'Siste 12 måneder');
      case 'all':
        return t('billing.periodAll', 'Alle perioder');
      default:
        return period;
    }
  };

  // PillTabs with badge counts
  const filterTabs = useMemo(
    () => [
      { id: 'all', label: t('bookings.all'), badge: String(tabCounts.all) },
      { id: 'paid', label: t('invoice.paid'), badge: tabCounts.paid > 0 ? String(tabCounts.paid) : undefined },
      { id: 'sent', label: t('invoice.sent'), badge: tabCounts.sent > 0 ? String(tabCounts.sent) : undefined },
      {
        id: 'overdue',
        label: t('invoice.overdue'),
        badge: tabCounts.overdue > 0 ? String(tabCounts.overdue) : undefined,
      },
    ],
    [t, tabCounts],
  );

  const handleTabChange = useCallback((tabId: string) => {
    setStatusFilter(tabId === 'all' ? undefined : (tabId as InvoiceStatus));
  }, []);

  const invoiceColumns: DataTableColumn<Invoice>[] = useMemo(
    () => [
      {
        id: 'reference',
        header: t('billing.invoiceNumber'),
        width: '140px',
        render: (inv) => (
          <Paragraph data-size="sm" className={s.reference}>
            {inv.reference}
          </Paragraph>
        ),
      },
      {
        id: 'description',
        header: t('common.description'),
        render: (inv) => (
          <Stack direction="vertical">
            <Paragraph data-size="sm" className={s.mediumWeight}>
              {inv.resourceName || inv.description || '-'}
            </Paragraph>
            {inv.bookingId && (
              <Paragraph data-size="xs" className={s.subtleText}>
                {t('billing.linkedBooking', 'Tilknyttet booking')}
              </Paragraph>
            )}
          </Stack>
        ),
      },
      {
        id: 'date',
        header: t('billing.dueDate'),
        width: '120px',
        render: (inv) => (
          <Paragraph data-size="sm" className={s.noMargin}>
            {formatDate(inv.createdAt)}
          </Paragraph>
        ),
      },
      {
        id: 'amount',
        header: t('common.amount'),
        align: 'right',
        width: '120px',
        render: (inv) => (
          <Paragraph data-size="sm" className={s.semiboldWeight}>
            {fmtCurrency(inv.amount)}
          </Paragraph>
        ),
      },
      {
        id: 'status',
        header: t('common.status'),
        width: '100px',
        render: (inv) => <InvoiceStatusBadge status={inv.status} />,
      },
      {
        id: 'actions',
        header: '',
        width: '50px',
        render: (inv) => (
          <Button
            type="button"
            variant="tertiary"
            data-size="sm"
            onClick={(e: React.MouseEvent) => handleDownload(e, inv.id)}
            disabled={downloadInvoice.isLoading}
            aria-label={t('common.download')}
          >
            <DownloadIcon />
          </Button>
        ),
      },
    ],
    [t, fmtCurrency, handleDownload, downloadInvoice.isLoading],
  );

  if (summaryError || invoicesError) {
    return (
      <PageContentLayout>
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader title={t('minside.billing')} subtitle={t('minside.billingDesc')} />

      {/* Summary Stats — 4 cards like backoffice */}
      {summaryLoading ? (
        <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
          <Spinner aria-label={t('common.loading')} />
        </Stack>
      ) : summary ? (
        <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'}>
          <StatCard
            title={t('billing.totalPaid')}
            value={fmtCurrency(summary.totalSpent)}
            description={getPeriodLabel(summary.period)}
            color="var(--ds-color-success-text-default)"
            icon={<CreditCardIcon />}
          />
          <StatCard
            title={t('billing.outstanding')}
            value={fmtCurrency(summary.pendingAmount)}
            description={t('billing.unpaidInvoices')}
            color={summary.pendingAmount > 0 ? 'var(--ds-color-warning-text-default)' : undefined}
            icon={<ClockIcon />}
          />
          <StatCard
            title={t('bookings.totalBookings')}
            value={summary.bookingCount}
            description={t('billing.billedBookings', 'Fakturerte bookinger')}
            icon={<CalendarIcon />}
          />
          <StatCard
            title={t('billing.pendingPayments', 'Ventende betalinger')}
            value={pendingCount}
            description={t('billing.awaitingPayment', 'Venter på betaling')}
            color={pendingCount > 0 ? 'var(--ds-color-accent-text-default)' : undefined}
            icon={<FileTextIcon />}
          />
        </Grid>
      ) : null}

      {/* Status Tabs */}
      <PillTabs
        tabs={filterTabs}
        activeTab={statusFilter ?? 'all'}
        onTabChange={handleTabChange}
        ariaLabel={t('billing.filterByStatus', 'Filtrer etter status')}
      />

      {/* Invoices List */}
      {invoicesLoading ? (
        <Stack direction="horizontal" justify="center" className={s.loadingCenterLg}>
          <Spinner aria-label={t('common.loading')} data-size="lg" />
        </Stack>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={t('billing.noInvoices')}
          description={
            statusFilter
              ? t('billing.noInvoicesForFilter', 'Ingen fakturaer med denne statusen.')
              : t('billing.noInvoicesDesc', 'Du har ingen fakturaer ennå.')
          }
        />
      ) : isMobile ? (
        /* Mobile: Card layout */
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          {invoices.map((invoice: Invoice) => (
            <Card
              key={invoice.id}
              className={s.invoiceCard}
              onClick={() => handleInvoiceClick(invoice)}
              role={invoice.bookingId ? 'button' : undefined}
              tabIndex={invoice.bookingId ? 0 : undefined}
              onKeyDown={
                invoice.bookingId
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleInvoiceClick(invoice);
                      }
                    }
                  : undefined
              }
            >
              <Stack direction="vertical" spacing="var(--ds-size-3)">
                {/* Top row: reference + status */}
                <Stack direction="horizontal" justify="between" align="start">
                  <Stack direction="vertical" spacing="var(--ds-size-1)">
                    <Paragraph data-size="sm" className={s.reference}>
                      {invoice.reference}
                    </Paragraph>
                    <Paragraph data-size="xs" className={s.subtleText}>
                      {formatDate(invoice.createdAt)}
                    </Paragraph>
                  </Stack>
                  <InvoiceStatusBadge status={invoice.status} />
                </Stack>

                {/* Description */}
                {(invoice.resourceName || invoice.description) && (
                  <Paragraph data-size="sm" className={s.invoiceDesc}>
                    {invoice.resourceName || invoice.description}
                  </Paragraph>
                )}

                {/* Bottom row: amount + download */}
                <Stack direction="horizontal" justify="between" align="center">
                  <Paragraph data-size="md" className={s.semiboldWeight}>
                    {fmtCurrency(invoice.amount)}
                  </Paragraph>
                  <Button
                    type="button"
                    variant="tertiary"
                    data-size="sm"
                    onClick={(e: React.MouseEvent) => handleDownload(e, invoice.id)}
                    disabled={downloadInvoice.isLoading}
                    aria-label={t('common.download')}
                  >
                    <DownloadIcon />
                    {t('common.download')}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : (
        /* Desktop: DataTable layout */
        <DataTable<Invoice>
          columns={invoiceColumns}
          data={invoices}
          getRowKey={(row) => row.id}
          onRowClick={(row) => handleInvoiceClick(row)}
          size="sm"
          emptyMessage={t('billing.noInvoices')}
        />
      )}
    </PageContentLayout>
  );
}
