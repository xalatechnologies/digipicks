/**
 * CreatorProfilePage — Web App
 *
 * Public creator profile: bio, 30-day performance stats, ROI chart,
 * recent picks (locked for non-subscribers), and subscribe CTA.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  StatusTag,
  Tag,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useCreatorProfile, usePublicTiers, useIsSubscribed, useSubscribe, useCreatorBranding, type Pick as PickType } from '@digilist-saas/sdk';
import { env, useAuth } from '@digilist-saas/app-shell';
import { useQuery } from 'convex/react';
import { api } from '@digilist-saas/sdk/convex-api';
import s from './creator-profile.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resultColor(result: string): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (result) {
    case 'won': return 'success';
    case 'lost': return 'danger';
    case 'push': return 'warning';
    default: return 'neutral';
  }
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

/** Build a simple daily ROI bar chart from recent picks. */
function buildRoiChart(picks: PickType[]): { date: string; roi: number }[] {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Group graded picks by day
  const dailyMap = new Map<string, { wagered: number; net: number }>();

  for (const pick of picks) {
    const time = pick.resultAt ?? new Date(pick.createdAt).getTime();
    if (time < thirtyDaysAgo) continue;
    if (pick.result === 'pending' || pick.result === 'void') continue;

    const date = new Date(time).toISOString().slice(0, 10);
    const entry = dailyMap.get(date) ?? { wagered: 0, net: 0 };

    if (pick.result === 'won') {
      entry.wagered += pick.units;
      entry.net += pick.units * (pick.oddsDecimal - 1);
    } else if (pick.result === 'lost') {
      entry.wagered += pick.units;
      entry.net -= pick.units;
    } else if (pick.result === 'push') {
      // No change
    }

    dailyMap.set(date, entry);
  }

  // Build sorted day entries
  const entries = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { wagered, net }]) => ({
      date,
      roi: wagered > 0 ? (net / wagered) * 100 : 0,
    }));

  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatorProfilePage() {
  const t = useT();
  const navigate = useNavigate();
  const { creatorId } = useParams<{ creatorId: string }>();
  const tenantId = env.tenantId;
  const auth = useAuth();

  // Inject creator-level brand CSS (white-label theming)
  useCreatorBranding(tenantId || undefined, creatorId);

  // Fetch creator brand config + assets for custom header/logo
  const creatorBrand = useQuery(
    api.domain.tenantConfig.getCreatorBranding,
    tenantId && creatorId ? { tenantId, creatorId } : 'skip'
  );
  const creatorAssets = useQuery(
    api.domain.tenantConfig.listCreatorBrandAssets,
    tenantId && creatorId ? { tenantId, creatorId } : 'skip'
  );
  const creatorLogo = creatorAssets?.find((a: any) => a.assetType === 'logo');
  const creatorBanner = creatorAssets?.find((a: any) => a.assetType === 'banner');

  const { profile, isLoading } = useCreatorProfile(
    tenantId as any,
    creatorId
  );

  const { tiers } = usePublicTiers(tenantId || undefined);
  const userId = auth.isAuthenticated ? (auth as any).user?.id : undefined;
  const { isSubscribed } = useIsSubscribed(userId, creatorId);
  const { subscribe, isLoading: subscribing } = useSubscribe();

  const handleSubscribe = async () => {
    if (!auth.isAuthenticated) {
      navigate('/register');
      return;
    }

    if (!tiers.length || !creatorId || !tenantId || !userId) {
      navigate('/pricing');
      return;
    }

    // Use the first available tier with a Stripe price
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
        returnUrl: `${window.location.origin}/creator/${creatorId}`,
        cancelUrl: `${window.location.origin}/creator/${creatorId}`,
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      // Error is tracked in the hook
    }
  };

  const roiData = useMemo(
    () => (profile?.recentPicks ? buildRoiChart(profile.recentPicks) : []),
    [profile?.recentPicks]
  );

  const maxAbsRoi = useMemo(
    () => Math.max(1, ...roiData.map((d) => Math.abs(d.roi))),
    [roiData]
  );

  // Loading
  if (isLoading) {
    return (
      <div className={s.pageContainer}>
        <div className={s.loadingState}>
          <Spinner data-size="lg" />
        </div>
      </div>
    );
  }

  // Not found
  if (!profile) {
    return (
      <div className={s.pageContainer}>
        <div className={s.notFoundState}>
          <Paragraph>{t('creator.notFound', 'Creator not found')}</Paragraph>
        </div>
      </div>
    );
  }

  // Use branded display name if creator has set one, else fall back to profile
  const brandedName = creatorBrand?.displayName || profile.displayName || profile.name || profile.email || 'Creator';
  const brandedTagline = creatorBrand?.tagline;
  // Use creator logo if available, else fall back to avatar
  const logoUrl = creatorLogo?.url;
  const stats = profile.stats;
  const hasBranding = !!creatorBrand?.primaryColor;

  return (
    <div className={s.pageContainer}>
      {/* Creator banner (white-label) */}
      {creatorBanner?.url && (
        <div
          className={s.brandBanner}
          style={{ backgroundImage: `url(${creatorBanner.url})` }}
        />
      )}

      {/* Branded header bar (white-label) */}
      {hasBranding && (
        <div
          className={s.brandHeader}
          style={{ backgroundColor: 'var(--creator-brand-primary, var(--ds-color-accent-base-default))' }}
        >
          {logoUrl && (
            <img src={logoUrl} alt={brandedName} className={s.brandLogo} />
          )}
          <div className={s.brandHeaderText}>
            <span className={s.brandName}>{brandedName}</span>
            {brandedTagline && (
              <span className={s.brandTagline}>{brandedTagline}</span>
            )}
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className={s.profileHeader}>
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={brandedName}
            className={s.avatar}
          />
        ) : (
          <div className={s.avatarPlaceholder} aria-hidden="true">
            {getInitials(profile.name, profile.email)}
          </div>
        )}

        <div className={s.profileInfo}>
          <Heading level={1} data-size="lg" className={s.profileName}>
            {brandedName}
          </Heading>
          {brandedTagline ? (
            <Paragraph data-size="sm" className={s.profileRole}>
              {brandedTagline}
            </Paragraph>
          ) : (
            <Paragraph data-size="sm" className={s.profileRole}>
              {t('creator.role', 'Creator')}
            </Paragraph>
          )}
          <div className={s.recordLine}>
            <span className={s.recordItem}>
              {stats.wins}W - {stats.losses}L - {stats.pushes}P
            </span>
          </div>
        </div>

        <div className={s.subscribeCta}>
          {isSubscribed ? (
            <StatusTag color="success" size="sm">
              {t('creator.subscribed', 'Subscribed')}
            </StatusTag>
          ) : (
            <Button
              variant="primary"
              data-size="md"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing
                ? t('common.loading', 'Loading...')
                : t('creator.subscribe', 'Subscribe')}
            </Button>
          )}
        </div>
      </div>

      {/* 30-day performance stats */}
      <div className={s.statsSection}>
        <div className={s.statsGrid}>
          <Card>
            <div className={s.statCard}>
              <div className={s.statValue}>{stats.totalPicks}</div>
              <div className={s.statLabel}>
                {t('creator.stats.totalPicks', 'Total Picks')}
              </div>
            </div>
          </Card>
          <Card>
            <div className={s.statCard}>
              <div
                className={s.statValue}
                style={{ color: 'var(--ds-color-success-text-default)' }}
              >
                {stats.winRate > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : '\u2014'}
              </div>
              <div className={s.statLabel}>
                {t('creator.stats.winRate', 'Win Rate')}
              </div>
            </div>
          </Card>
          <Card>
            <div className={s.statCard}>
              <div
                className={s.statValue}
                style={{
                  color:
                    stats.roi >= 0
                      ? 'var(--ds-color-success-text-default)'
                      : 'var(--ds-color-danger-text-default)',
                }}
              >
                {stats.roi > 0 ? `+${stats.roi}%` : stats.roi < 0 ? `${stats.roi}%` : '\u2014'}
              </div>
              <div className={s.statLabel}>
                {t('creator.stats.roi', 'ROI')}
              </div>
            </div>
          </Card>
          <Card>
            <div className={s.statCard}>
              <div
                className={s.statValue}
                style={{
                  color:
                    stats.netUnits >= 0
                      ? 'var(--ds-color-success-text-default)'
                      : 'var(--ds-color-danger-text-default)',
                }}
              >
                {stats.netUnits >= 0 ? '+' : ''}
                {stats.netUnits.toFixed(1)}u
              </div>
              <div className={s.statLabel}>
                {t('creator.stats.netUnits', 'Net Units')}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ROI Chart */}
      {roiData.length > 0 && (
        <div className={s.chartSection}>
          <Heading level={2} data-size="sm" className={s.sectionHeading}>
            {t('creator.roiChart', 'ROI (Last 30 Days)')}
          </Heading>
          <Card className={s.chartCard}>
            <div className={s.chartContainer}>
              {roiData.map((d) => {
                const height = Math.max(4, (Math.abs(d.roi) / maxAbsRoi) * 100);
                const isPositive = d.roi >= 0;
                return (
                  <div
                    key={d.date}
                    className={s.chartBar}
                    style={{
                      height: `${height}%`,
                      backgroundColor: isPositive
                        ? 'var(--ds-color-success-surface-default)'
                        : 'var(--ds-color-danger-surface-default)',
                    }}
                    title={`${d.date}: ${d.roi > 0 ? '+' : ''}${d.roi.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className={s.chartLabels}>
              {roiData.length > 0 && (
                <>
                  <span className={s.chartLabel}>{roiData[0].date.slice(5)}</span>
                  <span className={s.chartLabel}>
                    {roiData[roiData.length - 1].date.slice(5)}
                  </span>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Recent Picks */}
      <div className={s.picksSection}>
        <Heading level={2} data-size="sm" className={s.sectionHeading}>
          {t('creator.recentPicks', 'Recent Picks')}
        </Heading>

        {profile.recentPicks.length === 0 ? (
          <Paragraph className={s.emptyPicks}>
            {t('creator.noPicks', 'No picks posted yet.')}
          </Paragraph>
        ) : (
          <div className={s.picksList}>
            {profile.recentPicks.map((pick) => (
              <Card key={pick.id} className={s.pickCard}>
                <div className={s.pickHeader}>
                  <Paragraph className={s.pickEvent}>
                    {pick.event}
                  </Paragraph>
                  <StatusTag
                    color={resultColor(pick.result)}
                    size="sm"
                  >
                    {pick.result.toUpperCase()}
                  </StatusTag>
                </div>
                <div className={s.pickMeta}>
                  <Tag data-size="sm" data-color="neutral">
                    {pick.sport}
                  </Tag>
                  <span className={s.pickDetail}>{pick.pickType}</span>
                  <span className={s.pickDetail}>
                    <span className={s.pickOdds}>{pick.oddsAmerican}</span>
                    {' '}({pick.oddsDecimal.toFixed(2)})
                  </span>
                  <span className={s.pickDetail}>{pick.units}u</span>
                  <Tag data-size="sm" data-color="neutral">
                    {pick.confidence}
                  </Tag>
                </div>
                {pick.selection && (
                  <Paragraph data-size="sm" style={{ marginTop: 'var(--ds-size-2)' }}>
                    {pick.selection}
                  </Paragraph>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Subscribe CTA */}
      <Card className={s.statCard} style={{ textAlign: 'center', padding: 'var(--ds-size-6)' }}>
        <Heading level={3} data-size="sm">
          {t('creator.ctaTitle', 'Get access to all picks')}
        </Heading>
        <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 'var(--ds-size-2) 0 var(--ds-size-4)' }}>
          {t('creator.ctaDescription', 'Subscribe to unlock premium picks, detailed analysis, and real-time alerts.')}
        </Paragraph>
        {isSubscribed ? (
          <Paragraph data-size="md" style={{ color: 'var(--ds-color-success-text-default)' }}>
            {t('creator.alreadySubscribed', 'You are subscribed to this creator.')}
          </Paragraph>
        ) : (
          <Button
            variant="primary"
            data-size="lg"
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing
              ? t('common.loading', 'Loading...')
              : t('creator.subscribeCta', 'Subscribe Now')}
          </Button>
        )}
      </Card>
    </div>
  );
}
