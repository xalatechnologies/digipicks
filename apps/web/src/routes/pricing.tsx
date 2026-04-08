/**
 * PricingPage — Web App
 *
 * Displays publicly available subscription tiers with pricing,
 * benefits, and a CTA to register.
 */

import { useNavigate } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { usePublicTiers } from '@digilist-saas/sdk';
import { env } from '@digilist-saas/app-shell';
import s from './pricing.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInterval(interval: string, t: any): string {
  switch (interval) {
    case 'monthly':
      return t('pricing.perMonth', '/ mo');
    case 'quarterly':
      return t('pricing.perQuarter', '/ quarter');
    case 'yearly':
      return t('pricing.perYear', '/ year');
    case 'one_time':
      return t('pricing.oneTime', 'one-time');
    case 'lifetime':
      return t('pricing.lifetime', 'lifetime');
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingPage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env.tenantId;
  const { tiers, isLoading } = usePublicTiers(tenantId || undefined);

  return (
    <div className={s.pageContainer}>
      {/* Hero */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('pricing.title')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('pricing.subtitle')}
        </Paragraph>
      </Stack>

      {/* Tier cards */}
      {isLoading ? (
        <Paragraph>{t('common.loading')}</Paragraph>
      ) : tiers.length === 0 ? (
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>
            {t('pricing.noTiers', 'No pricing plans available at this time.')}
          </Paragraph>
        </div>
      ) : (
        <div className={s.tierGrid}>
          {tiers.map((tier) => (
            <Card key={tier._id} className={s.tierCard}>
              <Heading level={2} data-size="sm" className={s.tierName}>
                {tier.name}
              </Heading>

              <Paragraph className={s.tierDescription}>
                {tier.shortDescription || tier.description || ''}
              </Paragraph>

              <Paragraph data-size="lg" className={s.tierPrice}>
                {tier.price === 0
                  ? t('pricing.free', 'Free')
                  : `${tier.price} ${tier.currency}`}
                {tier.price > 0 && (
                  <span className={s.tierInterval}>
                    {' '}{formatInterval(tier.billingInterval, t)}
                  </span>
                )}
              </Paragraph>

              {tier.benefits.length > 0 && (
                <ul className={s.benefitsList}>
                  {tier.benefits.map((benefit) => (
                    <li key={benefit.id} className={s.benefitItem}>
                      <span className={s.benefitCheck} aria-hidden="true">&#10003;</span>
                      {benefit.label}
                    </li>
                  ))}
                </ul>
              )}

              <Button
                variant="primary"
                data-size="md"
                onClick={() => navigate('/register')}
              >
                {t('pricing.getStarted')}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* CTA section */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.ctaSection}>
        <Heading level={2} data-size="md">
          {t('pricing.ctaTitle')}
        </Heading>
        <Paragraph className={s.ctaText}>
          {t('pricing.ctaText')}
        </Paragraph>
        <Button
          variant="primary"
          data-size="lg"
          onClick={() => navigate('/register')}
        >
          {t('pricing.getStarted')}
        </Button>
      </Stack>
    </div>
  );
}
