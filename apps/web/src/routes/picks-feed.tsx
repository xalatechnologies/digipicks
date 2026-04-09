/**
 * PicksFeedPage — Web App
 *
 * Customer-facing pick feed with two tabs:
 *   - Following: picks from subscribed creators (always unlocked)
 *   - For You: discovery/trending picks (locked for non-subscribers)
 *
 * Uses real-time Convex subscriptions — new picks appear instantly.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
  NativeSelect,
  PillTabs,
  StatusTag,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { usePickFeedFollowing, usePickFeedForYou } from '@digilist-saas/sdk';
import type { FeedPick } from '@digilist-saas/sdk';
import { useAuth, env, VerificationBadge } from '@digilist-saas/app-shell';
import { SportFilter } from '@/components/SportFilter';
import s from './picks-feed.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESULTS = ['All', 'pending', 'won', 'lost', 'push', 'void'];
const PAGE_SIZE = 20;

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
] as const;

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

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function resultColor(result: string): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (result) {
    case 'won': return 'success';
    case 'lost': return 'danger';
    case 'push': return 'warning';
    case 'void': return 'neutral';
    default: return 'neutral';
  }
}

function confidenceClass(c: string): string {
  switch (c) {
    case 'high': return s.confidenceHigh;
    case 'medium': return s.confidenceMedium;
    default: return s.confidenceLow;
  }
}

// ---------------------------------------------------------------------------
// Pick Card — Unlocked
// ---------------------------------------------------------------------------

function UnlockedPickCard({ pick }: { pick: FeedPick }) {
  return (
    <Card className={s.pickCard}>
      <div className={s.pickCardHeader}>
        <div className={s.creatorAvatar}>
          {getInitials(pick.creator?.displayName || pick.creator?.name)}
        </div>
        <div className={s.creatorInfo}>
          <div className={s.creatorName}>
            {pick.creator?.displayName || pick.creator?.name || 'Unknown'}
            <VerificationBadge verified={pick.creator?.verified ?? false} size="sm" />
          </div>
          <div className={s.pickTimestamp}>{formatTimeAgo(pick.createdAt)}</div>
        </div>
        {pick.result !== 'pending' && (
          <StatusTag color={resultColor(pick.result)} data-size="sm" className={s.resultBadge}>
            {pick.result.toUpperCase()}
          </StatusTag>
        )}
      </div>

      <div className={s.pickBody}>
        <div className={s.pickEvent}>{pick.event}</div>
        <div className={s.pickMeta}>
          <StatusTag color="neutral" data-size="sm">{pick.sport}</StatusTag>
          <StatusTag color="neutral" data-size="sm">{pick.pickType}</StatusTag>
          <span className={confidenceClass(pick.confidence)}>
            {pick.confidence} confidence
          </span>
        </div>

        <div className={s.pickDetails}>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>Selection</span>
            <span className={s.detailValue}>{pick.selection}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>Odds</span>
            <span className={s.detailValue}>
              {pick.oddsAmerican} ({pick.oddsDecimal?.toFixed(2)})
            </span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>Units</span>
            <span className={s.detailValue}>{pick.units}u</span>
          </div>
        </div>

        {pick.analysis && (
          <Paragraph data-size="sm" style={{ marginTop: 'var(--ds-size-2)' }}>
            {pick.analysis}
          </Paragraph>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pick Card — Locked
// ---------------------------------------------------------------------------

function LockedPickCard({ pick, onSubscribe }: { pick: FeedPick; onSubscribe: () => void }) {
  return (
    <Card className={s.pickCard}>
      <div className={s.pickCardHeader}>
        <div className={s.creatorAvatar}>
          {getInitials(pick.creator?.displayName || pick.creator?.name)}
        </div>
        <div className={s.creatorInfo}>
          <div className={s.creatorName}>
            {pick.creator?.displayName || pick.creator?.name || 'Unknown'}
            <VerificationBadge verified={pick.creator?.verified ?? false} size="sm" />
          </div>
          <div className={s.pickTimestamp}>{formatTimeAgo(pick.createdAt)}</div>
        </div>
        {pick.result !== 'pending' && (
          <StatusTag color={resultColor(pick.result)} data-size="sm" className={s.resultBadge}>
            {pick.result.toUpperCase()}
          </StatusTag>
        )}
      </div>

      <div className={s.pickBody}>
        <div className={s.pickEvent}>{pick.event}</div>
        <div className={s.pickMeta}>
          <StatusTag color="neutral" data-size="sm">{pick.sport}</StatusTag>
          <StatusTag color="neutral" data-size="sm">{pick.pickType}</StatusTag>
          <span className={confidenceClass(pick.confidence)}>
            {pick.confidence} confidence
          </span>
        </div>

        <div className={s.lockedOverlay}>
          <div className={s.lockedContent}>
            <div className={s.pickDetails}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Selection</span>
                <span className={s.detailValue}>Lakers -3.5</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Odds</span>
                <span className={s.detailValue}>-110 (1.91)</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Units</span>
                <span className={s.detailValue}>2.0u</span>
              </div>
            </div>
          </div>
          <div className={s.lockedCta}>
            <span className={s.lockIcon} aria-hidden="true">&#128274;</span>
            <span className={s.lockText}>Subscribe to unlock this pick</span>
            <Button data-size="sm" variant="primary" onClick={onSubscribe}>
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function PicksFeedPage() {
  const t = useT();
  const navigate = useNavigate();
  const auth = useAuth();
  const tenantId = env.tenantId as string | undefined;
  const userId = auth.user?.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const sportParam = searchParams.get('sport') || 'All';

  const [activeTab, setActiveTab] = useState<string>('for-you');
  const [resultFilter, setResultFilter] = useState('All');

  const handleSportChange = useCallback(
    (sport: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (sport === 'All') {
          next.delete('sport');
        } else {
          next.set('sport', sport);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const feedParams = useMemo(() => ({
    sport: sportParam !== 'All' ? sportParam : undefined,
    result: resultFilter !== 'All' ? resultFilter : undefined,
    limit: PAGE_SIZE,
  }), [sportParam, resultFilter]);

  const forYou = usePickFeedForYou(tenantId as any, userId, feedParams);
  const following = usePickFeedFollowing(tenantId as any, userId, feedParams);

  const isFollowingTab = activeTab === 'following';
  const activeFeed = isFollowingTab ? following : forYou;
  const picks = activeFeed.picks;
  const isLoading = activeFeed.isLoading;

  const handleSubscribe = () => {
    navigate('/pricing');
  };

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('picks.feed.title', 'Pick Feed')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('picks.feed.subtitle', 'Sports betting picks from top creators')}
        </Paragraph>
      </Stack>

      {/* Tabs */}
      <div className={s.tabSection}>
        <PillTabs
          tabs={TABS.map((tab) => ({ ...tab, label: t(`picks.feed.tab.${tab.id}`, tab.label) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel={t('picks.feed.tabs', 'Feed tabs')}
        />
      </div>

      {/* Login prompt for Following tab */}
      {isFollowingTab && !auth.isAuthenticated && (
        <div className={s.loginPrompt}>
          <Paragraph className={s.loginPromptText}>
            {t('picks.feed.loginPrompt', 'Sign in to see picks from creators you follow')}
          </Paragraph>
          <Button data-size="sm" variant="primary" onClick={() => navigate('/login')}>
            {t('common.signIn', 'Sign In')}
          </Button>
        </div>
      )}

      {/* Sport filter chips */}
      <SportFilter value={sportParam} onChange={handleSportChange} />

      {/* Result filter */}
      <div className={s.filterRow}>
        <NativeSelect
          label={t('picks.feed.filterResult', 'Result')}
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className={s.filterSelect}
          data-size="sm"
        >
          {RESULTS.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? t('common.all', 'All Results') : r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Feed */}
      {isLoading ? (
        <Paragraph>{t('common.loading', 'Loading...')}</Paragraph>
      ) : picks.length === 0 ? (
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>
            {isFollowingTab
              ? t('picks.feed.emptyFollowing', 'No picks from creators you follow yet. Subscribe to creators to see their picks here.')
              : t('picks.feed.emptyForYou', 'No picks available yet. Check back soon!')}
          </Paragraph>
          {isFollowingTab && (
            <Button data-size="sm" variant="secondary" onClick={() => setActiveTab('for-you')}>
              {t('picks.feed.browseForYou', 'Browse For You')}
            </Button>
          )}
        </div>
      ) : (
        <div className={s.feedList}>
          {picks.map((pick) =>
            pick.isUnlocked ? (
              <Link key={pick.id} to={`/picks/${pick.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <UnlockedPickCard pick={pick} />
              </Link>
            ) : (
              <Link key={pick.id} to={`/picks/${pick.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <LockedPickCard pick={pick} onSubscribe={handleSubscribe} />
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
