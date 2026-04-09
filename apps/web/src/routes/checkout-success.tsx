/**
 * CheckoutSuccessPage — Web App
 *
 * Confirmation page shown after a successful Stripe subscription checkout.
 * Reads query params (?reference=...&status=success&sessionId=...) from Stripe redirect.
 * Shows subscription details once the webhook has activated the membership.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuth, env } from '@digilist-saas/app-shell';
import { useMySubscription } from '@digilist-saas/sdk';
import s from './checkout-success.module.css';

// Simple checkmark SVG — no raw HTML element, just an inline icon in a styled container
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CheckoutSuccessPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();

  const creatorId = searchParams.get('creatorId') || undefined;
  const status = searchParams.get('status');

  const userId = auth.isAuthenticated ? (auth as any).user?.id : undefined;

  // Poll for the subscription to appear (webhook may take a moment)
  const { subscription, isLoading: subLoading } = useMySubscription(userId, creatorId);

  // Track how long we've been waiting for the webhook to process
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  useEffect(() => {
    if (subscription) return;
    const timer = setTimeout(() => setWaitingTooLong(true), 15000);
    return () => clearTimeout(timer);
  }, [subscription]);

  // If no success status param, redirect home
  if (status !== 'success') {
    return (
      <div className={s.pageContainer}>
        <Paragraph>{t('checkout.invalidStatus', 'Invalid checkout status.')}</Paragraph>
        <Button variant="secondary" data-size="md" onClick={() => navigate('/')}>
          {t('common.goHome', 'Go Home')}
        </Button>
      </div>
    );
  }

  // Waiting for subscription to activate via webhook
  if (!subscription && !waitingTooLong) {
    return (
      <div className={s.pageContainer}>
        <div className={s.loadingState}>
          <Spinner data-size="lg" aria-label="Loading" />
          <Paragraph>{t('checkout.activating', 'Activating your subscription...')}</Paragraph>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      <div className={s.successIcon}>
        <CheckIcon />
      </div>

      <Heading level={1} data-size="lg" className={s.heading}>
        {t('checkout.successTitle', 'You\'re subscribed!')}
      </Heading>
      <Paragraph data-size="md" className={s.subtitle}>
        {t('checkout.successSubtitle', 'Your subscription is now active. You have full access to premium picks.')}
      </Paragraph>

      {subscription && (
        <Card className={s.detailsCard}>
          {subscription.tier?.name && (
            <div className={s.detailRow}>
              <span className={s.detailLabel}>{t('checkout.plan', 'Plan')}</span>
              <span className={s.detailValue}>{subscription.tier.name}</span>
            </div>
          )}
          {subscription.tier?.price != null && (
            <div className={s.detailRow}>
              <span className={s.detailLabel}>{t('checkout.price', 'Price')}</span>
              <span className={s.detailValue}>
                {subscription.tier.currency?.toUpperCase()} {(subscription.tier.price / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className={s.detailRow}>
            <span className={s.detailLabel}>{t('checkout.status', 'Status')}</span>
            <span className={s.detailValue} style={{ color: 'var(--ds-color-success-text-default)' }}>
              {subscription.isTrialing
                ? t('checkout.trialing', 'Free Trial')
                : t('checkout.active', 'Active')}
            </span>
          </div>
          {subscription.isTrialing && subscription.trialDaysRemaining != null && (
            <div className={s.detailRow}>
              <span className={s.detailLabel}>{t('checkout.trialEnds', 'Trial ends in')}</span>
              <span className={s.detailValue}>
                {t('checkout.daysRemaining', '{{count}} days', { count: subscription.trialDaysRemaining })}
              </span>
            </div>
          )}
        </Card>
      )}

      {waitingTooLong && !subscription && (
        <Card className={s.detailsCard}>
          <Paragraph data-size="sm" style={{ color: 'var(--ds-color-warning-text-default)' }}>
            {t('checkout.activationDelay', 'Your payment was successful but activation is taking a moment. Your subscription will appear shortly — you can safely navigate away.')}
          </Paragraph>
        </Card>
      )}

      <div className={s.actions}>
        {creatorId && (
          <Button
            variant="primary"
            data-size="md"
            onClick={() => navigate(`/creator/${creatorId}`)}
          >
            {t('checkout.viewCreator', 'View Creator')}
          </Button>
        )}
        <Button
          variant="secondary"
          data-size="md"
          onClick={() => navigate('/picks')}
        >
          {t('checkout.browsePicks', 'Browse Picks')}
        </Button>
      </div>
    </div>
  );
}
