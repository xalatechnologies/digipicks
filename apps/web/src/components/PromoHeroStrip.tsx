/**
 * PromoHeroStrip
 *
 * Configurable promotional hero strip rendered above the filter bar.
 * Shows up to 3 promotional cards (gift cards, resale, membership)
 * filtered by tenant module config. Dismissible via localStorage.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Paragraph, WalletIcon, TicketIcon, StarIcon, CloseIcon } from '@digipicks/ds';
import { useTenantConfig } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import styles from './PromoHeroStrip.module.css';

interface PromoCard {
  id: string;
  moduleId: string;
  route: string;
  iconVariant: 'accent' | 'success' | 'warning';
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  ctaKey: string;
}

const PROMO_CARDS: PromoCard[] = [
  {
    id: 'membership',
    moduleId: 'subscriptions',
    route: '/membership',
    iconVariant: 'warning',
    icon: <StarIcon size={24} />,
    titleKey: 'web.promoHero.membership.title',
    descriptionKey: 'web.promoHero.membership.description',
    ctaKey: 'web.promoHero.membership.cta',
  },
];

interface PromoHeroStripProps {
  tenantId: string | undefined;
  isOpen?: boolean;
  onDismiss?: () => void;
}

export function PromoHeroStrip({
  tenantId,
  isOpen = false,
  onDismiss,
}: PromoHeroStripProps): React.ReactElement | null {
  const navigate = useNavigate();
  const t = useT();
  const { config, isModuleEnabled, isLoading } = useTenantConfig(tenantId);

  const handleDismiss = React.useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  // Read optional promoHero settings from tenant config
  const promoHeroSettings = (config?.settings as Record<string, unknown> | undefined)?.promoHero as
    | { enabled?: boolean; hiddenCards?: string[] }
    | undefined;

  if (!isOpen) return null;

  // Avoid flash (show -> hide) while tenant/module config is still loading.
  if (isLoading) return null;

  // Check if hero is explicitly disabled
  if (isModuleEnabled('promo-hero') === false) return null;
  if (promoHeroSettings?.enabled === false) return null;

  const hiddenCards = new Set(promoHeroSettings?.hiddenCards ?? []);

  const visibleCards = PROMO_CARDS.filter((card) => !hiddenCards.has(card.id) && isModuleEnabled(card.moduleId));

  if (visibleCards.length === 0) {
    return (
      <div className={styles.strip}>
        <div className={styles.inner}>
          <div className={styles.emptyState}>
            <Paragraph data-size="md" className={styles.emptyTitle}>
              {t('web.promoHero.emptyTitle', 'Ingen tilbud å vise')}
            </Paragraph>
            <Paragraph data-size="sm" className={styles.emptyDescription}>
              {t(
                'web.promoHero.emptyDescription',
                'Gavekort, billettmarked og medlemskap er ikke aktivert for denne nettsiden, eller alle er skjult i innstillinger.',
              )}
            </Paragraph>
          </div>
        </div>
        <Button
          variant="tertiary"
          data-size="sm"
          className={styles.dismissBtn}
          onClick={handleDismiss}
          aria-label={t('web.promoHero.dismiss')}
        >
          <CloseIcon size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {visibleCards.map((card) => (
            <div key={card.id} className={styles.card}>
              <div className={styles.iconCircle} data-variant={card.iconVariant}>
                {card.icon}
              </div>
              <div className={styles.textBlock}>
                <div className={styles.title}>{t(card.titleKey)}</div>
                <div className={styles.description}>{t(card.descriptionKey)}</div>
              </div>
              <Button variant="secondary" data-size="sm" onClick={() => navigate(card.route)}>
                {t(card.ctaKey)}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <Button
        variant="tertiary"
        data-size="sm"
        className={styles.dismissBtn}
        onClick={handleDismiss}
        aria-label={t('web.promoHero.dismiss')}
      >
        <CloseIcon size={16} />
      </Button>
    </div>
  );
}

export default PromoHeroStrip;
