/**
 * Trial Settings Page
 *
 * Creator view: configure free trial periods for subscription tiers.
 * Shows current tier trial config with editable trial days.
 */

import { useState } from 'react';
import { useT } from '@digilist-saas/i18n';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Spinner,
    Textfield,
    PageContentLayout,
    EmptyState,
} from '@digilist-saas/ds';
import {
    usePublicTiers,
    useUpdateTierTrialDays,
    type SubscriptionTier,
} from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './trial-settings.module.css';

function formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(price / 100);
}

function TierTrialRow({
    tier,
    onSave,
    isSaving,
}: {
    tier: SubscriptionTier;
    onSave: (tierId: string, trialDays: number) => void;
    isSaving: boolean;
}) {
    const t = useT();
    const [trialDays, setTrialDays] = useState(String(tier.trialDays ?? 0));
    const currentValue = tier.trialDays ?? 0;
    const inputValue = parseInt(trialDays, 10) || 0;
    const hasChanged = inputValue !== currentValue;

    return (
        <div className={styles.tierCard}>
            <div className={styles.tierInfo}>
                <span className={styles.tierName}>{tier.name}</span>
                <span className={styles.tierPrice}>
                    {formatPrice(tier.price, tier.currency)} / {tier.billingInterval}
                </span>
            </div>
            <div className={styles.trialConfig}>
                <div className={styles.trialInput}>
                    <Textfield
                        type="number"
                        value={trialDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTrialDays(e.target.value)
                        }
                        aria-label={t(
                            'trialSettings.trialDaysLabel',
                            'Trial days'
                        )}
                        data-size="sm"
                    />
                </div>
                <Paragraph data-size="sm">
                    {t('trialSettings.days', 'days')}
                </Paragraph>
                {hasChanged && (
                    <Button
                        data-size="sm"
                        onClick={() => onSave(tier._id, inputValue)}
                        disabled={isSaving}
                    >
                        {t('trialSettings.save', 'Save')}
                    </Button>
                )}
            </div>
        </div>
    );
}

export function TrialSettingsPage() {
    const t = useT();
    const { user } = useAuthBridge();
    const tenantId = user?.tenantId as string;

    const { tiers, isLoading } = usePublicTiers(tenantId);
    const { update, isLoading: isSaving } = useUpdateTierTrialDays();

    const handleSave = async (tierId: string, trialDays: number) => {
        await update({ tierId, trialDays });
    };

    if (isLoading) {
        return (
            <PageContentLayout data-gap="sm">
                <Spinner aria-label="Loading" data-size="md" />
            </PageContentLayout>
        );
    }

    return (
        <PageContentLayout data-gap="sm">
            <Heading level={1} data-size="md">
                {t('trialSettings.title', 'Free Trial Settings')}
            </Heading>
            <Paragraph>
                {t(
                    'trialSettings.description',
                    'Configure free trial periods for your subscription tiers. Subscribers can try your picks before committing to a paid subscription.'
                )}
            </Paragraph>

            {tiers.length === 0 ? (
                <EmptyState
                    title={t('trialSettings.empty.title', 'No tiers configured')}
                    description={t(
                        'trialSettings.empty.description',
                        'Create subscription tiers first to configure trial periods.'
                    )}
                />
            ) : (
                <Card>
                    {tiers.map((tier: SubscriptionTier) => (
                        <TierTrialRow
                            key={tier._id}
                            tier={tier}
                            onSave={handleSave}
                            isSaving={isSaving}
                        />
                    ))}
                </Card>
            )}

            <Card>
                <Heading level={3} data-size="sm">
                    {t('trialSettings.howItWorks.title', 'How free trials work')}
                </Heading>
                <Paragraph data-size="sm">
                    {t(
                        'trialSettings.howItWorks.body',
                        'When a subscriber starts a free trial, they get full access to your picks for the configured number of days. No payment is charged during the trial. After the trial ends, their subscription automatically converts to paid unless they cancel.'
                    )}
                </Paragraph>
            </Card>
        </PageContentLayout>
    );
}
