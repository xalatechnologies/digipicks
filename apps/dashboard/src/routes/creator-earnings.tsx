/**
 * Creator Earnings Dashboard — revenue summary, subscriber counts, payout status
 *
 * Shows the logged-in creator their total earnings, MRR, subscriber count,
 * per-period earnings history, and payout history with status.
 */

import {
    Card,
    Heading,
    Paragraph,
    Spinner,
    PageContentLayout,
    EmptyState,
    StatusTag,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useMyEarningsSummary, useMyEarningsHistory, useMyPayouts } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './creator-earnings.module.css';

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('nb-NO', { style: 'currency', currency }).format(amount / 100);
}

function payoutStatusColor(status: string): 'success' | 'danger' | 'warning' | 'neutral' | 'info' {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'info';
        case 'pending': return 'warning';
        case 'failed': return 'danger';
        default: return 'neutral';
    }
}

function payoutStatusLabel(status: string, t: (key: string, fallback: string) => string): string {
    switch (status) {
        case 'completed': return t('earnings.payout.status.completed', 'Completed');
        case 'processing': return t('earnings.payout.status.processing', 'Processing');
        case 'pending': return t('earnings.payout.status.pending', 'Pending');
        case 'failed': return t('earnings.payout.status.failed', 'Failed');
        default: return status;
    }
}

export function CreatorEarningsPage() {
    const t = useT();
    const { user } = useAuthBridge();
    const tenantId = user?.tenantId as string;
    const userId = user?.id;

    const { summary, isLoading: summaryLoading } = useMyEarningsSummary(tenantId, userId);
    const { history, isLoading: historyLoading } = useMyEarningsHistory(tenantId, userId, 12);
    const { payouts, isLoading: payoutsLoading } = useMyPayouts(tenantId, userId);

    const isLoading = summaryLoading || historyLoading || payoutsLoading;

    if (isLoading) {
        return (
            <PageContentLayout data-gap="sm">
                <Spinner aria-label="Loading" data-size="md" />
            </PageContentLayout>
        );
    }

    const currency = summary?.currency ?? 'NOK';

    return (
        <PageContentLayout data-gap="sm">
            <Heading level={1} data-size="md">
                {t('earnings.title', 'Earnings')}
            </Heading>
            <Paragraph>
                {t('earnings.description', 'Your revenue summary, subscriber metrics, and payout history.')}
            </Paragraph>

            {/* ── Summary Cards ── */}
            <div className={styles.summaryCards}>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.totalEarnings', 'Total Net Earnings')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {formatCurrency(summary?.totalNetEarnings ?? 0, currency)}
                    </Heading>
                </Card>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.mrr', 'Monthly Revenue')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {formatCurrency(summary?.mrr ?? 0, currency)}
                    </Heading>
                </Card>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.subscribers', 'Subscribers')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {summary?.subscriberCount ?? 0}
                    </Heading>
                </Card>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.pendingPayout', 'Pending Payout')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {formatCurrency(summary?.pendingPayout ?? 0, currency)}
                    </Heading>
                </Card>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.totalPaidOut', 'Total Paid Out')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {formatCurrency(summary?.totalPaidOut ?? 0, currency)}
                    </Heading>
                </Card>
                <Card>
                    <Paragraph data-size="sm" className={styles.cardLabel}>
                        {t('earnings.platformFees', 'Platform Fees')}
                    </Paragraph>
                    <Heading level={3} data-size="lg" className={styles.cardValue}>
                        {formatCurrency(summary?.totalPlatformFees ?? 0, currency)}
                    </Heading>
                </Card>
            </div>

            {/* ── Revenue by Period ── */}
            <Heading level={2} data-size="sm" className={styles.sectionHeading}>
                {t('earnings.revenueHistory', 'Revenue by Month')}
            </Heading>

            {history.length === 0 ? (
                <EmptyState
                    title={t('earnings.history.empty.title', 'No earnings yet')}
                    description={t('earnings.history.empty.description', 'Revenue will appear here as subscribers join your plans.')}
                />
            ) : (
                <Card>
                    {history.map((period) => (
                        <div key={period._id} className={styles.historyRow}>
                            <div>
                                <span className={styles.historyPeriod}>{period.period}</span>
                                <span className={styles.historyMeta}>
                                    {' '}&middot; {period.subscriberCount} {t('earnings.subscribersLabel', 'subscribers')}
                                </span>
                            </div>
                            <span className={styles.historyAmount}>
                                {formatCurrency(period.netEarnings, period.currency)}
                            </span>
                        </div>
                    ))}
                </Card>
            )}

            {/* ── Payout History ── */}
            <Heading level={2} data-size="sm" className={styles.sectionHeading}>
                {t('earnings.payoutHistory', 'Payout History')}
            </Heading>

            {payouts.length === 0 ? (
                <EmptyState
                    title={t('earnings.payouts.empty.title', 'No payouts yet')}
                    description={t('earnings.payouts.empty.description', 'Payouts will appear here once your earnings are transferred.')}
                />
            ) : (
                <Card>
                    {payouts.map((payout) => (
                        <div key={payout._id} className={styles.payoutRow}>
                            <div className={styles.payoutInfo}>
                                <span className={styles.payoutAmount}>
                                    {formatCurrency(payout.netAmount, payout.currency)}
                                </span>
                                <span className={styles.payoutDate}>
                                    {new Date(payout.requestedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <StatusTag color={payoutStatusColor(payout.status)} size="sm">
                                {payoutStatusLabel(payout.status, t)}
                            </StatusTag>
                        </div>
                    ))}
                </Card>
            )}
        </PageContentLayout>
    );
}
