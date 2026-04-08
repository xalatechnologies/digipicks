/**
 * Payouts Page — Creator Stripe Connect Onboarding
 *
 * Allows creators to set up their Stripe Connect account for receiving
 * subscription payouts. Shows account status and onboarding link.
 */

import {
    Button,
    Card,
    Heading,
    Paragraph,
    Spinner,
    PageContentLayout,
    Grid,
    StatusTag,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useCreatorAccount, useSetupCreatorPayouts } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './payouts.module.css';

// ─────────────────────────── Helpers ───────────────────────────

function statusColor(status: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
    switch (status) {
        case 'active': return 'success';
        case 'onboarding': return 'info';
        case 'restricted': return 'danger';
        case 'pending': return 'warning';
        default: return 'neutral';
    }
}

function statusLabel(status: string, t: ReturnType<typeof useT>): string {
    switch (status) {
        case 'active': return t('payouts.status.active', 'Active');
        case 'onboarding': return t('payouts.status.onboarding', 'Onboarding');
        case 'restricted': return t('payouts.status.restricted', 'Restricted');
        case 'pending': return t('payouts.status.pending', 'Pending');
        case 'disabled': return t('payouts.status.disabled', 'Disabled');
        default: return status;
    }
}

// ─────────────────────────── Component ───────────────────────────

export function PayoutsPage() {
    const t = useT();
    const { user } = useAuthBridge();
    const userId = user?.id;
    const tenantId = user?.tenantId as string;

    const { account, isLoading: accountLoading } = useCreatorAccount(userId);
    const { setup, isLoading: setupLoading, error: setupError } = useSetupCreatorPayouts();

    const handleSetupPayouts = async () => {
        if (!userId || !user?.email || !tenantId) return;

        const currentUrl = window.location.origin;
        const result = await setup({
            tenantId,
            userId,
            email: user.email,
            refreshUrl: `${currentUrl}/payouts`,
            returnUrl: `${currentUrl}/payouts`,
        });

        if (result?.onboardingUrl) {
            window.location.href = result.onboardingUrl;
        }
    };

    if (accountLoading) {
        return (
            <PageContentLayout data-gap="sm">
                <Spinner aria-label="Loading" data-size="md" />
            </PageContentLayout>
        );
    }

    return (
        <PageContentLayout data-gap="sm">
            <Heading level={1} data-size="md">
                {t('payouts.title', 'Payouts')}
            </Heading>
            <Paragraph>
                {t('payouts.description', 'Manage your Stripe Connect account to receive subscription payouts from your subscribers.')}
            </Paragraph>

            {!account ? (
                <Card className={styles.statusCard}>
                    <Heading level={2} data-size="sm">
                        {t('payouts.setup.title', 'Set Up Payouts')}
                    </Heading>
                    <Paragraph>
                        {t('payouts.setup.description', 'Connect your Stripe account to start receiving payouts from subscriber payments. You\'ll be redirected to Stripe to complete the setup.')}
                    </Paragraph>

                    {setupError && (
                        <Paragraph data-color="danger">
                            {setupError}
                        </Paragraph>
                    )}

                    <Button
                        variant="primary"
                        data-size="md"
                        onClick={handleSetupPayouts}
                        disabled={setupLoading}
                    >
                        {setupLoading
                            ? t('common.loading', 'Loading...')
                            : t('payouts.setup.button', 'Connect with Stripe')}
                    </Button>
                </Card>
            ) : (
                <Grid columns="1fr" data-gap="sm">
                    <Card className={styles.statusCard}>
                        <Heading level={2} data-size="sm">
                            {t('payouts.accountStatus', 'Account Status')}
                        </Heading>

                        <StatusTag
                            color={statusColor(account.status)}
                            size="sm"
                        >
                            {statusLabel(account.status, t)}
                        </StatusTag>

                        <ul className={styles.infoList}>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    {t('payouts.chargesEnabled', 'Charges Enabled')}
                                </span>
                                <span className={styles.infoValue}>
                                    {account.chargesEnabled ? '✓' : '✗'}
                                </span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    {t('payouts.payoutsEnabled', 'Payouts Enabled')}
                                </span>
                                <span className={styles.infoValue}>
                                    {account.payoutsEnabled ? '✓' : '✗'}
                                </span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>
                                    {t('payouts.detailsSubmitted', 'Details Submitted')}
                                </span>
                                <span className={styles.infoValue}>
                                    {account.detailsSubmitted ? '✓' : '✗'}
                                </span>
                            </li>
                        </ul>

                        {account.status !== 'active' && (
                            <Button
                                variant="secondary"
                                data-size="sm"
                                onClick={handleSetupPayouts}
                                disabled={setupLoading}
                            >
                                {t('payouts.continueSetup', 'Continue Setup')}
                            </Button>
                        )}
                    </Card>
                </Grid>
            )}
        </PageContentLayout>
    );
}
