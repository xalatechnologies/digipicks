/**
 * PickDetailPage — Web App
 *
 * Shareable permalink page for a single pick.
 * Public picks show full details; premium/gated picks show a locked
 * overlay with subscribe CTA for non-subscribers.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  StatusTag,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import {
  usePick,
  useCreatorProfile,
  useIsSubscribed,
  useIsTailed,
  useTailPick,
  useUntailPick,
  useSubscribe,
  usePublicTiers,
} from '@digilist-saas/sdk';
import { env, useAuth } from '@digilist-saas/app-shell';
import s from './pick-detail.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(epoch: number | string | undefined): string {
  if (!epoch) return '\u2014';
  const d = typeof epoch === 'number' ? new Date(epoch) : new Date(epoch);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resultBannerClass(result: string): string {
  switch (result) {
    case 'won':
      return s.resultWon;
    case 'lost':
      return s.resultLost;
    case 'push':
      return s.resultPush;
    case 'void':
      return s.resultVoid;
    default:
      return s.resultPending;
  }
}

function resultLabel(result: string, t: (k: string, fb: string) => string): string {
  switch (result) {
    case 'won':
      return t('picks.detail.resultWon', 'Won');
    case 'lost':
      return t('picks.detail.resultLost', 'Lost');
    case 'push':
      return t('picks.detail.resultPush', 'Push');
    case 'void':
      return t('picks.detail.resultVoid', 'Void');
    default:
      return t('picks.detail.resultPending', 'Pending');
  }
}

function confidenceClass(c: string): string {
  switch (c) {
    case 'high':
      return s.confidenceHigh;
    case 'medium':
      return s.confidenceMedium;
    default:
      return s.confidenceLow;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PickDetailPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id: pickId } = useParams<{ id: string }>();
  const tenantId = env.tenantId;
  const auth = useAuth();
  const userId = auth.isAuthenticated ? auth.user?.id : undefined;

  // Core data
  const { pick, isLoading } = usePick(pickId, userId);
  const creatorId = pick?.creatorId;

  // Creator profile (for creator info card)
  const { profile: creatorProfile } = useCreatorProfile(
    tenantId as any,
    creatorId,
  );

  // Subscription state
  const { isSubscribed } = useIsSubscribed(userId, creatorId);
  const { tiers } = usePublicTiers(tenantId || undefined);
  const { subscribe, isLoading: subscribing } = useSubscribe();

  // Tail state
  const { isTailed } = useIsTailed(userId, pickId);
  const tailPick = useTailPick();
  const untailPick = useUntailPick();

  // --- Handlers ---

  const handleSubscribe = async () => {
    if (!auth.isAuthenticated) {
      navigate('/register');
      return;
    }
    if (!tiers.length || !creatorId || !tenantId || !userId) {
      navigate('/pricing');
      return;
    }
    const tier = tiers.find((t) => t.stripePriceId) ?? tiers[0];
    if (!tier?.stripePriceId) {
      navigate('/pricing');
      return;
    }
    try {
      const result = await subscribe({
        tenantId,
        userId,
        tierId: tier._id,
        creatorId,
        returnUrl: `${window.location.origin}/picks/${pickId}`,
        cancelUrl: `${window.location.origin}/picks/${pickId}`,
      });
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      // Error tracked in hook
    }
  };

  const handleTail = async () => {
    if (!auth.isAuthenticated) {
      navigate('/register');
      return;
    }
    if (!tenantId || !userId || !pickId) return;
    try {
      await tailPick.mutateAsync({ tenantId: tenantId as any, userId: userId as any, pickId });
    } catch {
      // Error tracked in hook
    }
  };

  const handleUntail = async () => {
    if (!userId || !pickId) return;
    try {
      await untailPick.mutateAsync({ userId: userId as any, pickId });
    } catch {
      // Error tracked in hook
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className={s.pageContainer}>
        <div className={s.centeredState}>
          <Spinner data-size="lg" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // --- Not found ---
  if (!pick) {
    return (
      <div className={s.pageContainer}>
        <div className={s.centeredState}>
          <div style={{ textAlign: 'center' }}>
            <Heading level={2} data-size="md">
              {t('picks.detail.notFound', 'Pick not found')}
            </Heading>
            <Paragraph data-size="sm" style={{ margin: 'var(--ds-size-3) 0' }}>
              {t('picks.detail.notFoundDesc', 'This pick may have been removed or does not exist.')}
            </Paragraph>
            <Button variant="secondary" data-size="sm" onClick={() => navigate('/picks')}>
              {t('picks.detail.backToFeed', 'Back to Feed')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Is the pick gated and the user is NOT subscribed?
  const isLocked = pick.isGated && !isSubscribed;
  const creatorName =
    pick.creator?.displayName || pick.creator?.name || creatorProfile?.displayName || creatorProfile?.name || 'Creator';
  const stats = creatorProfile?.stats;

  return (
    <div className={s.pageContainer}>
      {/* Back link */}
      <div className={s.backRow}>
        <Button variant="tertiary" data-size="sm" onClick={() => navigate('/picks')}>
          &larr; {t('picks.detail.backToFeed', 'Back to Feed')}
        </Button>
      </div>

      {/* Result banner */}
      <div className={`${s.resultBanner} ${resultBannerClass(pick.result)}`}>
        <StatusTag
          color={
            pick.result === 'won'
              ? 'success'
              : pick.result === 'lost'
                ? 'danger'
                : pick.result === 'push'
                  ? 'warning'
                  : 'neutral'
          }
          data-size="sm"
        >
          {resultLabel(pick.result, t)}
        </StatusTag>
        {pick.resultAt && (
          <span className={s.eventDate}>
            {t('picks.detail.gradedOn', 'Graded')}: {formatDate(pick.resultAt)}
          </span>
        )}
      </div>

      {/* Event heading */}
      <Heading level={1} data-size="lg" className={s.eventHeading}>
        {pick.event}
      </Heading>

      {/* Tags: sport, league, pick type, confidence */}
      <div className={s.tagsRow}>
        <StatusTag color="neutral" data-size="sm">{pick.sport}</StatusTag>
        {pick.league && <StatusTag color="neutral" data-size="sm">{pick.league}</StatusTag>}
        <StatusTag color="neutral" data-size="sm">{pick.pickType}</StatusTag>
        <span className={confidenceClass(pick.confidence)}>
          {pick.confidence} {t('picks.detail.confidence', 'confidence')}
        </span>
      </div>

      {/* Timestamp */}
      <div className={s.timestamp}>
        {t('picks.detail.posted', 'Posted')}: {formatDate(pick.createdAt)}
        {pick.eventDate && (
          <> &middot; {t('picks.detail.eventDate', 'Event')}: {formatDate(pick.eventDate)}</>
        )}
      </div>

      {/* Pick details — locked or unlocked */}
      {isLocked ? (
        <div className={s.lockedOverlay}>
          {/* Blurred fake content */}
          <div className={s.lockedContent}>
            <div className={s.detailsGrid}>
              <div className={s.detailCell}>
                <span className={s.detailLabel}>{t('picks.detail.selection', 'Selection')}</span>
                <span className={s.detailValue}>Team A -3.5</span>
              </div>
              <div className={s.detailCell}>
                <span className={s.detailLabel}>{t('picks.detail.odds', 'Odds')}</span>
                <span className={s.detailValue}>-110 (1.91)</span>
              </div>
              <div className={s.detailCell}>
                <span className={s.detailLabel}>{t('picks.detail.units', 'Units')}</span>
                <span className={s.detailValue}>2.0u</span>
              </div>
            </div>
            <div style={{ padding: 'var(--ds-size-4)' }}>
              <Paragraph>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</Paragraph>
            </div>
          </div>

          {/* Subscribe CTA */}
          <div className={s.lockedCta}>
            <span className={s.lockIcon} aria-hidden="true">&#128274;</span>
            <span className={s.lockTitle}>
              {t('picks.detail.premiumPick', 'Premium Pick')}
            </span>
            <span className={s.lockSubtitle}>
              {t('picks.detail.subscribeToUnlock', 'Subscribe to this creator to unlock full pick details and analysis.')}
            </span>
            <Button variant="primary" data-size="md" onClick={handleSubscribe} disabled={subscribing}>
              {subscribing
                ? t('common.loading', 'Loading...')
                : t('picks.detail.subscribeBtn', 'Subscribe to Unlock')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Full details grid */}
          <div className={s.detailsGrid}>
            {pick.selection && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>{t('picks.detail.selection', 'Selection')}</span>
                <span className={s.detailValue}>{pick.selection}</span>
              </div>
            )}
            <div className={s.detailCell}>
              <span className={s.detailLabel}>{t('picks.detail.odds', 'Odds')}</span>
              <span className={s.detailValue}>
                {pick.oddsAmerican || '\u2014'}{' '}
                {pick.oddsDecimal != null && `(${pick.oddsDecimal.toFixed(2)})`}
              </span>
            </div>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>{t('picks.detail.units', 'Units')}</span>
              <span className={s.detailValue}>{pick.units != null ? `${pick.units}u` : '\u2014'}</span>
            </div>
          </div>

          {/* Analysis */}
          {pick.analysis && (
            <div className={s.analysisSection}>
              <Heading level={3} data-size="xs" className={s.analysisHeading}>
                {t('picks.detail.analysis', 'Analysis')}
              </Heading>
              <Paragraph data-size="md" className={s.analysisText}>
                {pick.analysis}
              </Paragraph>
            </div>
          )}
        </>
      )}

      {/* Actions: Tail/Untail */}
      {auth.isAuthenticated && !isLocked && (
        <div className={s.actionsRow}>
          {isTailed ? (
            <Button variant="secondary" data-size="sm" onClick={handleUntail}>
              {t('picks.detail.untail', 'Remove from Tracker')}
            </Button>
          ) : (
            <Button variant="primary" data-size="sm" onClick={handleTail}>
              {t('picks.detail.tail', 'Add to Tracker')}
            </Button>
          )}
        </div>
      )}

      {/* Creator info card */}
      <Card className={s.creatorCard}>
        <Link to={`/creator/${creatorId}`} style={{ textDecoration: 'none' }}>
          <div className={s.creatorCardInner}>
            {creatorProfile?.avatarUrl ? (
              <img
                src={creatorProfile.avatarUrl}
                alt={creatorName}
                className={s.creatorAvatarImg}
              />
            ) : (
              <div className={s.creatorAvatar} aria-hidden="true">
                {getInitials(creatorName)}
              </div>
            )}
            <div className={s.creatorMeta}>
              <div className={s.creatorName}>{creatorName}</div>
              {stats && (
                <div className={s.creatorRecord}>
                  {stats.wins}W - {stats.losses}L
                  {stats.winRate > 0 && ` \u00b7 ${(stats.winRate * 100).toFixed(0)}% ${t('picks.detail.winRate', 'win rate')}`}
                  {stats.roi !== 0 && ` \u00b7 ${stats.roi > 0 ? '+' : ''}${stats.roi}% ROI`}
                </div>
              )}
            </div>
            <Button variant="tertiary" data-size="sm" tabIndex={-1}>
              {t('picks.detail.viewProfile', 'View Profile')} &rarr;
            </Button>
          </div>
        </Link>
      </Card>

      {/* Bottom subscribe CTA for non-subscribers */}
      {!isSubscribed && creatorId && (
        <Card className={s.creatorCard} style={{ textAlign: 'center' }}>
          <Heading level={3} data-size="sm">
            {t('picks.detail.ctaTitle', 'Get all picks from this creator')}
          </Heading>
          <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 'var(--ds-size-2) 0 var(--ds-size-4)' }}>
            {t('picks.detail.ctaDesc', 'Subscribe to unlock premium picks, detailed analysis, and real-time alerts.')}
          </Paragraph>
          <Button variant="primary" data-size="md" onClick={handleSubscribe} disabled={subscribing}>
            {subscribing
              ? t('common.loading', 'Loading...')
              : t('picks.detail.subscribeCta', 'Subscribe Now')}
          </Button>
        </Card>
      )}
    </div>
  );
}
