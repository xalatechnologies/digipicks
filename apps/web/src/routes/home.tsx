/**
 * HomePage — DigiPicks marketing homepage.
 *
 * Sports-picks-native landing: hero, trust band, featured creators (top ROI),
 * how it works, leaderboard preview, creator value-prop band, footer CTA.
 */

import { Link, useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Spinner } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useLeaderboard } from '@digipicks/sdk';
import type { LeaderboardEntry } from '@digipicks/sdk';
import { env, useAuth } from '@digipicks/app-shell';
import s from './home.module.css';

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRoi(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(1)}%`;
}

function formatWinRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

// Inline SVGs wrapped in a span so we don't import raw <svg> into JSX widely.
// These are purely decorative icons for the trust band.
function TrustIcon({ kind }: { kind: 'verified' | 'chart' | 'cancel' | 'lock' }) {
  const paths: Record<typeof kind, string> = {
    verified: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    chart: 'M3 3v18h18M7 15l4-4 4 4 5-5',
    cancel: 'M6 18L18 6M6 6l12 12',
    lock: 'M12 11c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2zm6-2V7a6 6 0 10-12 0v2H4v13h16V9h-2z',
  };
  return (
    <span className={s.trustIcon} aria-hidden="true">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[kind]} />
      </svg>
    </span>
  );
}

function CreatorCard({ entry, onClick }: { entry: LeaderboardEntry; onClick: () => void }) {
  const name = entry.creator?.displayName || entry.creator?.name || 'Unknown';
  const handle = entry.creator?.email?.split('@')[0];
  const sport: string | undefined = undefined;

  return (
    <Card className={s.creatorCard} onClick={onClick} role="button" tabIndex={0}>
      <div className={s.creatorHeader}>
        {entry.creator?.avatarUrl ? (
          <img src={entry.creator.avatarUrl} alt={name} className={s.avatar} />
        ) : (
          <div className={s.avatarPlaceholder}>{getInitials(name)}</div>
        )}
        <div>
          <div className={s.creatorName}>{name}</div>
          {handle && <div className={s.creatorHandle}>@{handle}</div>}
        </div>
      </div>
      <div className={s.statsRow}>
        <div className={s.stat}>
          <span className={s.statLabel}>Win rate</span>
          <span className={s.statValue}>{formatWinRate(entry.winRate)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>ROI</span>
          <span className={`${s.statValue} ${entry.roi >= 0 ? s.positive : ''}`}>{formatRoi(entry.roi)}</span>
        </div>
      </div>
      <span className={s.textLink}>View profile →</span>
    </Card>
  );
}

export function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env.tenantId as any;
  const auth = useAuth();
  const isLoggedIn = auth.isAuthenticated;

  const { entries: topByRoi, isLoading: loadingFeatured } = useLeaderboard(tenantId, {
    timeframe: '30d',
    sortBy: 'roi',
    limit: 4,
  });

  const { entries: topForPreview, isLoading: loadingPreview } = useLeaderboard(tenantId, {
    timeframe: '30d',
    sortBy: 'roi',
    limit: 5,
  });

  return (
    <div className={s.page}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <Heading data-size="xl" className={s.heroTitle}>
            {t('home.hero.title', 'Premium sports picks from vetted creators.')}
          </Heading>
          <Paragraph data-size="lg" className={s.heroSub}>
            {t('home.hero.sub', 'Curated, trust-first, sports-picks-native — not a generic creator marketplace.')}
          </Paragraph>
          <div className={s.ctaRow}>
            <Button data-size="lg" data-color="accent" onClick={() => navigate('/creators')}>
              {t('home.hero.browse', 'Browse creators')}
            </Button>
            <Button
              data-size="lg"
              variant="secondary"
              onClick={() => navigate(isLoggedIn ? '/creator-apply' : '/creator-apply')}
            >
              {t('home.hero.apply', 'Apply as a creator')}
            </Button>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="md">{t('home.trust.title', 'Why DigiPicks')}</Heading>
        </div>
        <div className={s.trustGrid}>
          <Card className={s.trustCard}>
            <TrustIcon kind="verified" />
            <Heading data-size="xs">{t('home.trust.verified.title', 'Verified creators')}</Heading>
            <Paragraph>
              {t('home.trust.verified.body', 'Every creator is vetted before they can sell picks.')}
            </Paragraph>
          </Card>
          <Card className={s.trustCard}>
            <TrustIcon kind="chart" />
            <Heading data-size="xs">{t('home.trust.track.title', 'Transparent track records')}</Heading>
            <Paragraph>
              {t('home.trust.track.body', 'Every pick graded. Win rate and ROI visible to everyone.')}
            </Paragraph>
          </Card>
          <Card className={s.trustCard}>
            <TrustIcon kind="cancel" />
            <Heading data-size="xs">{t('home.trust.cancel.title', 'Cancel anytime')}</Heading>
            <Paragraph>
              {t('home.trust.cancel.body', 'No lock-in. Stop your subscription whenever you want.')}
            </Paragraph>
          </Card>
          <Card className={s.trustCard}>
            <TrustIcon kind="lock" />
            <Heading data-size="xs">{t('home.trust.secure.title', 'Secure billing')}</Heading>
            <Paragraph>
              {t('home.trust.secure.body', 'Payments processed securely. Your data stays private.')}
            </Paragraph>
          </Card>
        </div>
      </section>

      {/* Featured creators */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="md">{t('home.featured.title', 'Featured creators')}</Heading>
          <Paragraph>{t('home.featured.sub', 'Top performers by ROI over the last 30 days.')}</Paragraph>
        </div>
        {loadingFeatured ? (
          <Spinner aria-label="Loading" />
        ) : topByRoi.length === 0 ? (
          <Card className={s.trustCard}>
            <Paragraph>{t('home.featured.empty', 'Creators coming soon. Check back shortly.')}</Paragraph>
          </Card>
        ) : (
          <div className={s.creatorsGrid}>
            {topByRoi.slice(0, 4).map((entry) => (
              <CreatorCard
                key={entry.creatorId}
                entry={entry}
                onClick={() => navigate(`/creator/${entry.creatorId}`)}
              />
            ))}
          </div>
        )}
        <div className={s.linkRow}>
          <Link to="/creators" className={s.textLink}>
            {t('home.featured.viewAll', 'View all creators →')}
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="md">{t('home.how.title', 'How it works')}</Heading>
        </div>
        <div className={s.howSteps}>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>1</div>
            <Heading data-size="xs">{t('home.how.discover.title', 'Discover')}</Heading>
            <Paragraph>
              {t('home.how.discover.body', 'Browse vetted creators ranked by ROI, win rate, and streak.')}
            </Paragraph>
          </Card>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>2</div>
            <Heading data-size="xs">{t('home.how.subscribe.title', 'Subscribe')}</Heading>
            <Paragraph>
              {t('home.how.subscribe.body', 'Pick a creator and subscribe to their picks. Cancel anytime.')}
            </Paragraph>
          </Card>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>3</div>
            <Heading data-size="xs">{t('home.how.track.title', 'Track results')}</Heading>
            <Paragraph>{t('home.how.track.body', 'Follow graded picks in real time and measure your edge.')}</Paragraph>
          </Card>
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="md">{t('home.lb.title', 'Live leaderboard')}</Heading>
          <Paragraph>{t('home.lb.sub', 'Top 5 creators right now.')}</Paragraph>
        </div>
        <Card>
          <div className={s.lbPreview}>
            {loadingPreview ? (
              <div style={{ padding: 'var(--ds-size-6)' }}>
                <Spinner aria-label="Loading" />
              </div>
            ) : topForPreview.length === 0 ? (
              <div style={{ padding: 'var(--ds-size-6)' }}>
                <Paragraph>{t('home.lb.empty', 'No graded picks yet.')}</Paragraph>
              </div>
            ) : (
              topForPreview.slice(0, 5).map((entry) => {
                const name = entry.creator?.displayName || entry.creator?.name || 'Unknown';
                return (
                  <div
                    key={entry.creatorId}
                    className={s.lbRow}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/creator/${entry.creatorId}`)}
                  >
                    <span className={s.lbRank}>#{entry.rank}</span>
                    <span className={s.lbName}>{name}</span>
                    <span className={`${s.lbStat} ${s.hideOnMobile}`}>{formatWinRate(entry.winRate)}</span>
                    <span className={`${s.lbStat} ${entry.roi >= 0 ? s.positive : ''}`}>{formatRoi(entry.roi)}</span>
                    <span className={`${s.lbStat} ${s.hideOnMobile}`}>
                      {entry.currentStreak > 0 ? `${entry.currentStreak}${entry.streakType}` : '—'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <div className={s.linkRow}>
          <Link to="/leaderboard" className={s.textLink}>
            {t('home.lb.full', 'See full leaderboard →')}
          </Link>
        </div>
      </section>

      {/* Creator value-prop band */}
      <section className={s.creatorBand}>
        <div className={s.creatorBandInner}>
          <Heading data-size="lg">{t('home.creatorBand.title', 'Are you a creator?')}</Heading>
          <Paragraph data-size="lg">
            {t(
              'home.creatorBand.body',
              'Monetize your sports expertise with a transparent track record and recurring subscribers.',
            )}
          </Paragraph>
          <Button data-size="lg" data-color="accent" onClick={() => navigate('/creator-apply')}>
            {t('home.creatorBand.cta', 'Apply now')}
          </Button>
        </div>
      </section>

      {/* Footer CTA */}
      <section className={s.footerCta}>
        <Heading data-size="lg">{t('home.footerCta.title', 'Ready to find your edge?')}</Heading>
        <Button data-size="lg" data-color="accent" onClick={() => navigate('/creators')}>
          {t('home.footerCta.cta', 'Browse creators')}
        </Button>
      </section>
    </div>
  );
}

export default HomePage;
