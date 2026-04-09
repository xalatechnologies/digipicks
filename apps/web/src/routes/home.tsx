/**
 * HomePage — DigiPicks marketing homepage.
 *
 * Whop-inspired, sports-picks-native landing: bold hero, stats strip, sport chips,
 * featured creators, recent picks preview, trust band, how it works,
 * leaderboard preview, testimonials, dual CTA bands, footer CTA.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Tag } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useLeaderboard } from '@digipicks/sdk';
import type { LeaderboardEntry } from '@digipicks/sdk';
import { env, useAuth } from '@digipicks/app-shell';
import s from './home.module.css';

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC', 'Tennis', 'Golf'];

const PLACEHOLDER_CREATORS: PlaceholderCreator[] = [
  { id: 'p1', name: 'Sharp Sam', handle: 'sharpsam', sport: 'NFL', winRate: 64.2, roi: 28.4, streak: 7 },
  { id: 'p2', name: 'ROI Rachel', handle: 'roirachel', sport: 'NBA', winRate: 61.8, roi: 24.1, streak: 5 },
  { id: 'p3', name: 'Streak King', handle: 'streakking', sport: 'MLB', winRate: 59.5, roi: 19.7, streak: 9 },
  { id: 'p4', name: 'Puck Prophet', handle: 'puckprophet', sport: 'NHL', winRate: 58.1, roi: 17.3, streak: 4 },
  { id: 'p5', name: 'Pitch Perfect', handle: 'pitchperfect', sport: 'Soccer', winRate: 56.9, roi: 15.0, streak: 3 },
  { id: 'p6', name: 'Octagon Oracle', handle: 'octagonoracle', sport: 'UFC', winRate: 62.3, roi: 22.8, streak: 6 },
];

const RECENT_PICKS = [
  { id: 'r1', creator: 'Sharp Sam', sport: 'NFL', pick: 'Chiefs -3.5', odds: '-110', status: 'Live' },
  { id: 'r2', creator: 'ROI Rachel', sport: 'NBA', pick: 'Celtics ML', odds: '-145', status: 'Won' },
  { id: 'r3', creator: 'Streak King', sport: 'MLB', pick: 'Dodgers O8.5', odds: '+100', status: 'Pending' },
  { id: 'r4', creator: 'Octagon Oracle', sport: 'UFC', pick: 'Poirier ITD', odds: '+160', status: 'Won' },
];

const TESTIMONIALS = [
  {
    quote: 'Finally a place where every pick is graded. No cherry-picking, no BS.',
    author: 'Marcus T.',
    role: 'Subscriber',
  },
  {
    quote: 'My subscriber base tripled in 3 months. The transparent track record sells itself.',
    author: 'Sarah L.',
    role: 'Creator',
  },
  { quote: 'Up 18% ROI in my first 30 days. Real sharps, real results.', author: 'David K.', role: 'Subscriber' },
];

interface PlaceholderCreator {
  id: string;
  name: string;
  handle: string;
  sport: string;
  winRate: number;
  roi: number;
  streak: number;
}

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
        width="32"
        height="32"
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

function CreatorSkeleton() {
  return (
    <Card className={s.creatorCard}>
      <div className={s.creatorHeader}>
        <div className={`${s.avatarPlaceholder} ${s.skeleton}`} />
        <div className={s.skelTextGroup}>
          <div className={`${s.skeleton} ${s.skelLine}`} />
          <div className={`${s.skeleton} ${s.skelLineShort}`} />
        </div>
      </div>
      <div className={s.statsRow}>
        <div className={`${s.skeleton} ${s.skelStat}`} />
        <div className={`${s.skeleton} ${s.skelStat}`} />
        <div className={`${s.skeleton} ${s.skelStat}`} />
      </div>
    </Card>
  );
}

function CreatorCardReal({ entry, onClick }: { entry: LeaderboardEntry; onClick: () => void }) {
  const name = entry.creator?.displayName || entry.creator?.name || 'Unknown';
  const handle = entry.creator?.email?.split('@')[0];
  return (
    <Card className={s.creatorCard} onClick={onClick} role="button" tabIndex={0}>
      <div className={s.creatorHeader}>
        {entry.creator?.avatarUrl ? (
          <img src={entry.creator.avatarUrl} alt={name} className={s.avatar} />
        ) : (
          <div className={s.avatarPlaceholder}>{getInitials(name)}</div>
        )}
        <div className={s.creatorMeta}>
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
        <div className={s.stat}>
          <span className={s.statLabel}>Streak</span>
          <span className={s.statValue}>
            {entry.currentStreak > 0 ? `${entry.currentStreak}${entry.streakType}` : '—'}
          </span>
        </div>
      </div>
      <Button
        data-size="sm"
        data-color="accent"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        View profile
      </Button>
    </Card>
  );
}

function PlaceholderCreatorCard({ creator, onClick }: { creator: PlaceholderCreator; onClick: () => void }) {
  return (
    <Card className={s.creatorCard} onClick={onClick} role="button" tabIndex={0}>
      <div className={s.creatorHeader}>
        <div className={s.avatarPlaceholder}>{getInitials(creator.name)}</div>
        <div className={s.creatorMeta}>
          <div className={s.creatorName}>{creator.name}</div>
          <div className={s.creatorHandle}>@{creator.handle}</div>
        </div>
        <Tag data-color="accent" className={s.sportTag}>
          {creator.sport}
        </Tag>
      </div>
      <div className={s.statsRow}>
        <div className={s.stat}>
          <span className={s.statLabel}>Win rate</span>
          <span className={s.statValue}>{formatWinRate(creator.winRate)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>ROI</span>
          <span className={`${s.statValue} ${s.positive}`}>{formatRoi(creator.roi)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Streak</span>
          <span className={s.statValue}>{creator.streak}W</span>
        </div>
      </div>
      <Button
        data-size="sm"
        data-color="accent"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        View profile
      </Button>
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
    limit: 6,
  });

  const { entries: topForPreview, isLoading: loadingPreview } = useLeaderboard(tenantId, {
    timeframe: '30d',
    sortBy: 'roi',
    limit: 5,
  });

  // Show placeholders whenever there's no real data — including the case
  // where the leaderboard query is "skip" (no tenantId) or never resolves.
  // We give the live query ~1.2s to hydrate, then fall back to placeholders.
  const [waitedForFeatured, setWaitedForFeatured] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedForFeatured(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const hasRealCreators = topByRoi.length > 0;
  const showFeaturedSkeleton = loadingFeatured && !waitedForFeatured;

  return (
    <div className={s.page}>
      {/* HERO */}
      <section className={s.hero}>
        <div className={s.heroOrb} aria-hidden="true" />
        <div className={s.heroOrb2} aria-hidden="true" />
        <div className={s.heroInner}>
          <Tag data-color="accent" className={s.heroBadge}>
            {t('home.hero.badge', 'The creator marketplace for sports picks')}
          </Tag>
          <Heading data-size="xl" className={s.heroTitle}>
            {t('home.hero.title', 'Find your edge. Follow the sharps.')}
          </Heading>
          <Paragraph data-size="lg" className={s.heroSub}>
            {t(
              'home.hero.sub',
              'Subscribe to vetted sports-picks creators with transparent, auto-graded track records. Cancel anytime.',
            )}
          </Paragraph>
          <div className={s.ctaRow}>
            <Button data-size="lg" data-color="accent" onClick={() => navigate('/creators')}>
              {t('home.hero.browse', 'Browse creators')}
            </Button>
            <Button data-size="lg" variant="secondary" onClick={() => navigate(isLoggedIn ? '/picks' : '/register')}>
              {t('home.hero.secondary', 'See live picks')}
            </Button>
          </div>

          {/* Stats strip */}
          <div className={s.statsStrip}>
            <div className={s.statsItem}>
              <div className={s.statsNumber}>250+</div>
              <div className={s.statsLabel}>{t('home.stats.creators', 'Verified creators')}</div>
            </div>
            <div className={s.statsDivider} aria-hidden="true" />
            <div className={s.statsItem}>
              <div className={s.statsNumber}>42K</div>
              <div className={s.statsLabel}>{t('home.stats.subs', 'Active subscribers')}</div>
            </div>
            <div className={s.statsDivider} aria-hidden="true" />
            <div className={s.statsItem}>
              <div className={s.statsNumber}>180K</div>
              <div className={s.statsLabel}>{t('home.stats.picks', 'Picks graded')}</div>
            </div>
            <div className={s.statsDivider} aria-hidden="true" />
            <div className={s.statsItem}>
              <div className={s.statsNumber}>+14.2%</div>
              <div className={s.statsLabel}>{t('home.stats.roi', 'Avg top-10 ROI')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* SPORT CHIPS */}
      <section className={s.sportsSection}>
        <div className={s.sportsInner}>
          <div className={s.sportsHeader}>
            <Heading data-size="sm">{t('home.sports.title', 'Pick your sport')}</Heading>
          </div>
          <div className={s.sportsRow}>
            {SPORTS.map((sport) => (
              <Link key={sport} to={`/creators?sport=${sport}`} className={s.sportChip}>
                {sport}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CREATORS */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.featured.title', 'Featured creators')}</Heading>
          <Paragraph data-size="lg" className={s.sectionSub}>
            {t('home.featured.sub', 'Top performers by ROI over the last 30 days.')}
          </Paragraph>
        </div>

        {!hasRealCreators && !showFeaturedSkeleton && (
          <div className={s.banner}>
            <Paragraph>{t('home.featured.comingSoon', 'Featured creators coming soon — here is a preview.')}</Paragraph>
          </div>
        )}

        <div className={s.creatorsGrid}>
          {showFeaturedSkeleton
            ? Array.from({ length: 6 }).map((_, i) => <CreatorSkeleton key={i} />)
            : hasRealCreators
              ? topByRoi
                  .slice(0, 6)
                  .map((entry) => (
                    <CreatorCardReal
                      key={entry.creatorId}
                      entry={entry}
                      onClick={() => navigate(`/creator/${entry.creatorId}`)}
                    />
                  ))
              : PLACEHOLDER_CREATORS.map((c) => (
                  <PlaceholderCreatorCard key={c.id} creator={c} onClick={() => navigate('/creators')} />
                ))}
        </div>
        <div className={s.linkRow}>
          <Link to="/creators" className={s.textLink}>
            {t('home.featured.viewAll', 'View all creators →')}
          </Link>
        </div>
      </section>

      {/* RECENT PICKS */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.picks.title', 'Recent picks')}</Heading>
          <Paragraph data-size="lg" className={s.sectionSub}>
            {t('home.picks.sub', 'A live look at picks published across the platform.')}
          </Paragraph>
        </div>
        <div className={s.picksGrid}>
          {RECENT_PICKS.map((p) => (
            <Card key={p.id} className={s.pickCard}>
              <div className={s.pickHeader}>
                <div className={s.avatarPlaceholder}>{getInitials(p.creator)}</div>
                <div className={s.creatorMeta}>
                  <div className={s.creatorName}>{p.creator}</div>
                  <div className={s.creatorHandle}>{p.sport}</div>
                </div>
                <Tag data-color={p.status === 'Won' ? 'success' : p.status === 'Live' ? 'accent' : 'neutral'}>
                  {p.status}
                </Tag>
              </div>
              <div className={s.pickBody}>
                <div className={s.pickSelection}>{p.pick}</div>
                <div className={s.pickOdds}>{p.odds}</div>
              </div>
            </Card>
          ))}
        </div>
        <div className={s.linkRow}>
          <Link to="/picks" className={s.textLink}>
            {t('home.picks.viewAll', 'See all picks →')}
          </Link>
        </div>
      </section>

      {/* TRUST BAND */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.trust.title', 'Why DigiPicks')}</Heading>
          <Paragraph data-size="lg" className={s.sectionSub}>
            {t('home.trust.sub', 'Built for bettors who want proof, not promises.')}
          </Paragraph>
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
            <Heading data-size="xs">{t('home.trust.track.title', 'Auto-graded results')}</Heading>
            <Paragraph>
              {t('home.trust.track.body', 'Every pick graded automatically. Win rate and ROI visible to all.')}
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
            <Heading data-size="xs">{t('home.trust.secure.title', 'Secure payments')}</Heading>
            <Paragraph>
              {t('home.trust.secure.body', 'Payments processed securely. Your data stays private.')}
            </Paragraph>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.how.title', 'How it works')}</Heading>
          <Paragraph data-size="lg" className={s.sectionSub}>
            {t('home.how.sub', 'Three steps to start following the sharps.')}
          </Paragraph>
        </div>
        <div className={s.howSteps}>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>1</div>
            <Heading data-size="sm">{t('home.how.discover.title', 'Discover')}</Heading>
            <Paragraph>
              {t('home.how.discover.body', 'Browse vetted creators ranked by ROI, win rate, and streak.')}
            </Paragraph>
          </Card>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>2</div>
            <Heading data-size="sm">{t('home.how.subscribe.title', 'Subscribe')}</Heading>
            <Paragraph>
              {t('home.how.subscribe.body', 'Pick a creator and subscribe to their picks. Cancel anytime.')}
            </Paragraph>
          </Card>
          <Card className={s.stepCard}>
            <div className={s.stepNumber}>3</div>
            <Heading data-size="sm">{t('home.how.track.title', 'Track results')}</Heading>
            <Paragraph>{t('home.how.track.body', 'Follow graded picks in real time and measure your edge.')}</Paragraph>
          </Card>
        </div>
      </section>

      {/* LEADERBOARD PREVIEW */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.lb.title', 'Live leaderboard')}</Heading>
          <Paragraph data-size="lg" className={s.sectionSub}>
            {t('home.lb.sub', 'Top 5 creators right now.')}
          </Paragraph>
        </div>
        <Card className={s.lbCard}>
          <div className={s.lbPreview}>
            {loadingPreview && !waitedForFeatured
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={s.lbRow}>
                    <span className={`${s.skeleton} ${s.skelLineShort}`} />
                    <span className={`${s.skeleton} ${s.skelLine}`} />
                    <span className={`${s.skeleton} ${s.skelStat}`} />
                  </div>
                ))
              : topForPreview.length === 0
                ? PLACEHOLDER_CREATORS.slice(0, 5).map((c, i) => (
                    <div
                      key={c.id}
                      className={s.lbRow}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate('/creators')}
                    >
                      <span className={s.lbRank}>#{i + 1}</span>
                      <span className={s.lbName}>{c.name}</span>
                      <span className={`${s.lbStat} ${s.hideOnMobile}`}>{formatWinRate(c.winRate)}</span>
                      <span className={`${s.lbStat} ${s.positive}`}>{formatRoi(c.roi)}</span>
                      <span className={`${s.lbStat} ${s.hideOnMobile}`}>{c.streak}W</span>
                    </div>
                  ))
                : topForPreview.slice(0, 5).map((entry) => {
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
                        <span className={`${s.lbStat} ${entry.roi >= 0 ? s.positive : ''}`}>
                          {formatRoi(entry.roi)}
                        </span>
                        <span className={`${s.lbStat} ${s.hideOnMobile}`}>
                          {entry.currentStreak > 0 ? `${entry.currentStreak}${entry.streakType}` : '—'}
                        </span>
                      </div>
                    );
                  })}
          </div>
        </Card>
        <div className={s.linkRow}>
          <Link to="/leaderboard" className={s.textLink}>
            {t('home.lb.full', 'See full leaderboard →')}
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Heading data-size="lg">{t('home.testimonials.title', 'Trusted by sharps and subscribers')}</Heading>
        </div>
        <div className={s.testimonialsGrid}>
          {TESTIMONIALS.map((tt, i) => (
            <Card key={i} className={s.testimonialCard}>
              <div className={s.quoteMark} aria-hidden="true">
                “
              </div>
              <Paragraph data-size="lg" className={s.quoteBody}>
                {tt.quote}
              </Paragraph>
              <div className={s.quoteAuthor}>
                <div className={s.avatarPlaceholder}>{getInitials(tt.author)}</div>
                <div>
                  <div className={s.creatorName}>{tt.author}</div>
                  <div className={s.creatorHandle}>{tt.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SUBSCRIBER CTA BAND */}
      <section className={s.ctaBand}>
        <div className={s.ctaBandInner}>
          <Heading data-size="lg">{t('home.subBand.title', 'Find your edge.')}</Heading>
          <Paragraph data-size="lg">
            {t('home.subBand.body', 'Browse hundreds of vetted creators and subscribe in seconds.')}
          </Paragraph>
          <Button data-size="lg" data-color="accent" onClick={() => navigate('/creators')}>
            {t('home.subBand.cta', 'Browse creators')}
          </Button>
        </div>
      </section>

      {/* CREATOR CTA BAND */}
      <section className={s.creatorBand}>
        <div className={s.creatorBandInner}>
          <Tag data-color="accent">{t('home.creatorBand.badge', 'For creators')}</Tag>
          <Heading data-size="lg">{t('home.creatorBand.title', 'Are you a sharp?')}</Heading>
          <Paragraph data-size="lg">
            {t(
              'home.creatorBand.body',
              'Monetize your sports expertise with a transparent track record and recurring subscribers.',
            )}
          </Paragraph>
          <Button data-size="lg" data-color="accent" onClick={() => navigate('/creator-apply')}>
            {t('home.creatorBand.cta', 'Apply as a creator')}
          </Button>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className={s.footerCta}>
        <div className={s.footerCtaInner}>
          <Heading data-size="xl" className={s.footerCtaTitle}>
            {t('home.footerCta.title', 'Ready to find your edge?')}
          </Heading>
          <Paragraph data-size="lg" className={s.heroSub}>
            {t('home.footerCta.sub', 'Join thousands of bettors following the sharps on DigiPicks.')}
          </Paragraph>
          <div className={s.ctaRow}>
            <Button data-size="lg" data-color="accent" onClick={() => navigate('/creators')}>
              {t('home.footerCta.cta', 'Browse creators')}
            </Button>
            <Button data-size="lg" variant="secondary" onClick={() => navigate('/register')}>
              {t('home.footerCta.signup', 'Create free account')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
