/**
 * ListingsPage — EdgePicks Landing Page
 *
 * 9-section conversion funnel:
 *   1. Hero — exclusivity-driven CTA
 *   2. Today's Events — live/upcoming sports events
 *   3. Why Switch — competitor pain points
 *   4. Tools — creator tool highlights
 *   5. Platform Preview — dashboard mockups
 *   6. Command Center — creator dashboard visualization
 *   7. Creator Discovery — browse top creators
 *   8. Testimonials — social proof
 *   9. Final CTA — application push
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Button } from '@digilist-saas/ds';
import { useAuth } from '@digilist-saas/app-shell';
import { useT } from '@digilist-saas/i18n';
import s from './listings.module.css';

// ---------------------------------------------------------------------------
// Static data — Today's Events
// ---------------------------------------------------------------------------

const TODAYS_EVENTS = [
  { id: '1', sport: 'NBA', matchup: 'Lakers vs Celtics', time: '7:30 PM ET', live: true },
  { id: '2', sport: 'NFL', matchup: 'Chiefs vs Bills', time: '8:15 PM ET', live: false },
  { id: '3', sport: 'MLB', matchup: 'Yankees vs Dodgers', time: '9:00 PM ET', live: false },
  { id: '4', sport: 'NHL', matchup: 'Oilers vs Panthers', time: '7:00 PM ET', live: true },
  { id: '5', sport: 'UFC', matchup: 'Fight Night Main Card', time: '10:00 PM ET', live: false },
  { id: '6', sport: 'Soccer', matchup: 'Liverpool vs Arsenal', time: '3:00 PM ET', live: false },
];

// ---------------------------------------------------------------------------
// Static data — Why Switch pain points
// ---------------------------------------------------------------------------

const PAIN_POINTS = [
  {
    id: 'transparency',
    icon: '\u{1F4CA}',
    titleKey: 'landing.whySwitch.transparency.title',
    titleDefault: 'Verified Results, Not Screenshots',
    bodyKey: 'landing.whySwitch.transparency.body',
    bodyDefault:
      'Every pick is tracked and graded automatically. No cherry-picked screenshots, no hidden losses. Your record is your record.',
  },
  {
    id: 'pricing',
    icon: '\u{1F4B0}',
    titleKey: 'landing.whySwitch.pricing.title',
    titleDefault: 'Smart Pricing, Not Race-to-Bottom',
    bodyKey: 'landing.whySwitch.pricing.body',
    bodyDefault:
      'Dynamic pricing based on your actual performance. Better record = higher justified price. No more $10/month undervaluing your edge.',
  },
  {
    id: 'infrastructure',
    icon: '\u{26A1}',
    titleKey: 'landing.whySwitch.infrastructure.title',
    titleDefault: 'Built for Betting, Not Social Media',
    bodyKey: 'landing.whySwitch.infrastructure.body',
    bodyDefault:
      'Purpose-built tools for sports picks: odds tracking, unit sizing, sport-specific analytics. Not another feed with a tip jar.',
  },
];

// ---------------------------------------------------------------------------
// Static data — Creator Tools
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    id: 'analytics',
    icon: '\u{1F4C8}',
    titleKey: 'landing.tools.analytics.title',
    titleDefault: 'Performance Analytics',
    descKey: 'landing.tools.analytics.desc',
    descDefault: 'Real-time ROI tracking, sport breakdowns, and streak analysis across all your picks.',
  },
  {
    id: 'pricing-tool',
    icon: '\u{1F3AF}',
    titleKey: 'landing.tools.pricing.title',
    titleDefault: 'Smart Pricing',
    descKey: 'landing.tools.pricing.desc',
    descDefault: 'AI-suggested pricing tiers based on your track record, volume, and subscriber growth.',
  },
  {
    id: 'grading',
    icon: '\u{2705}',
    titleKey: 'landing.tools.grading.title',
    titleDefault: 'Auto-Grading',
    descKey: 'landing.tools.grading.desc',
    descDefault: 'Picks are graded automatically when games finish. No manual updates needed.',
  },
  {
    id: 'broadcasts',
    icon: '\u{1F4E2}',
    titleKey: 'landing.tools.broadcasts.title',
    titleDefault: 'Subscriber Broadcasts',
    descKey: 'landing.tools.broadcasts.desc',
    descDefault: 'Send alerts, analysis, and late-breaking picks directly to your subscribers.',
  },
];

// ---------------------------------------------------------------------------
// Static data — Featured Creators (placeholder until leaderboard hook is wired)
// ---------------------------------------------------------------------------

const FEATURED_CREATORS = [
  { id: 'c1', name: 'SharpShooter', sport: 'NBA', record: '187W-112L', roi: '+22.3%', winRate: '62.5%', picks: 299 },
  { id: 'c2', name: 'GridIronEdge', sport: 'NFL', record: '94W-68L', roi: '+15.8%', winRate: '58.0%', picks: 162 },
  { id: 'c3', name: 'DiamondPicks', sport: 'MLB', record: '210W-155L', roi: '+11.2%', winRate: '57.5%', picks: 365 },
  { id: 'c4', name: 'IceKingBets', sport: 'NHL', record: '78W-52L', roi: '+18.9%', winRate: '60.0%', picks: 130 },
];

// ---------------------------------------------------------------------------
// Static data — Testimonials
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  {
    id: '1',
    quote:
      'I moved from DubClub and my subscriber count doubled in 3 months. The verified record built real trust.',
    name: 'Marcus T.',
    role: 'NBA Creator',
    initials: 'MT',
  },
  {
    id: '2',
    quote:
      'Finally a platform that treats betting picks like a real business. The analytics dashboard alone is worth it.',
    name: 'Sarah K.',
    role: 'Multi-Sport Creator',
    initials: 'SK',
  },
  {
    id: '3',
    quote:
      'As a subscriber, I love that every record is verified. No more wondering if a creator is legit.',
    name: 'James L.',
    role: 'Subscriber',
    initials: 'JL',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/\s/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Sub-components (each calls useT internally to avoid type prop issues)
// ---------------------------------------------------------------------------

function HeroSection() {
  const t = useT();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className={s.hero}>
      {/* Floating sport icons for visual energy */}
      <div className={s.heroOrbs} aria-hidden="true">
        <span className={s.heroOrb} style={{ top: '12%', left: '8%', animationDelay: '0s' }}>🏀</span>
        <span className={s.heroOrb} style={{ top: '20%', right: '10%', animationDelay: '1.4s' }}>🏈</span>
        <span className={s.heroOrb} style={{ bottom: '25%', left: '14%', animationDelay: '2.8s' }}>⚾</span>
        <span className={s.heroOrb} style={{ bottom: '18%', right: '12%', animationDelay: '0.7s' }}>🏒</span>
        <span className={s.heroOrb} style={{ top: '45%', left: '4%', animationDelay: '2.1s' }}>⚽</span>
        <span className={s.heroOrb} style={{ top: '50%', right: '5%', animationDelay: '3.5s' }}>🥊</span>
      </div>

      <div className={s.heroInner}>
        <div className={s.heroLabel}>
          <span className={s.heroLabelDot} />
          {t('landing.hero.label', 'Applications Now Open')}
        </div>
        <h1 className={s.heroTitle}>
          {t('landing.hero.titleLine1', 'NOT BUILT FOR')}{' '}
          <span className={s.heroTitleAccent}>
            {t('landing.hero.titleAccent', 'EVERYONE')}
          </span>
        </h1>
        <p className={s.heroSubtitle}>
          {t(
            'landing.hero.subtitle',
            'EdgePicks is the premium platform where sports betting creators build real businesses — with verified records, smart pricing, and professional tools.',
          )}
        </p>
        <div className={s.heroCtas}>
          {!isAuthenticated ? (
            <>
              <Button onClick={() => navigate('/register')} data-size="lg" color="accent">
                {t('landing.hero.cta', 'Apply for Access')}
              </Button>
              <Button onClick={() => navigate('/picks')} data-size="lg" variant="secondary">
                {t('landing.hero.ctaBrowse', 'Browse Picks')}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => { window.location.href = String(import.meta.env.VITE_DASHBOARD_URL || '/min-side'); }}
              data-size="lg"
              color="accent"
            >
              {t('landing.hero.ctaDashboard', 'Go to Dashboard')}
            </Button>
          )}
        </div>
        <div className={s.heroTrust}>
          <span className={s.heroTrustItem}>✓ {t('landing.hero.trustVerified', 'Verified Records')}</span>
          <span className={s.heroTrustDivider} />
          <span className={s.heroTrustItem}>✓ {t('landing.hero.trustManual', 'Manually Reviewed')}</span>
          <span className={s.heroTrustDivider} />
          <span className={s.heroTrustItem}>✓ {t('landing.hero.trustPro', 'Pro-Grade Tools')}</span>
        </div>
        <div className={s.heroStats}>
          <div className={s.heroStatItem}>
            <div className={s.heroStatValue}>500+</div>
            <div className={s.heroStatLabel}>{t('landing.hero.statCreators', 'Verified Creators')}</div>
          </div>
          <div className={s.heroStatItem}>
            <div className={s.heroStatValue}>50K+</div>
            <div className={s.heroStatLabel}>{t('landing.hero.statPicks', 'Picks Tracked')}</div>
          </div>
          <div className={s.heroStatItem}>
            <div className={s.heroStatValue}>+12.4%</div>
            <div className={s.heroStatLabel}>{t('landing.hero.statRoi', 'Avg. Creator ROI')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveEventsStrip() {
  const t = useT();
  const [activeSport, setActiveSport] = React.useState<string | null>(null);

  const sports = React.useMemo(
    () => Array.from(new Set(TODAYS_EVENTS.map((e) => e.sport))),
    [],
  );

  const filtered = activeSport
    ? TODAYS_EVENTS.filter((e) => e.sport === activeSport)
    : TODAYS_EVENTS;

  const liveCount = TODAYS_EVENTS.filter((e) => e.live).length;

  return (
    <section className={s.eventsStrip}>
      <div className={s.eventsInner}>
        <div className={s.eventsHeader}>
          <div className={s.eventsHeaderLeft}>
            <div className={s.liveDot} />
            <span className={s.eventsLabel}>{t('landing.events.label', "Today's Events")}</span>
            {liveCount > 0 && (
              <span className={s.eventsLiveCount}>
                {liveCount} {t('landing.events.live', 'LIVE NOW')}
              </span>
            )}
          </div>
          <div className={s.eventsSportChips}>
            <button
              type="button"
              className={`${s.sportChip} ${activeSport === null ? s.sportChipActive : ''}`}
              onClick={() => setActiveSport(null)}
            >
              {t('landing.events.all', 'All')}
            </button>
            {sports.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`${s.sportChip} ${activeSport === sp ? s.sportChipActive : ''}`}
                onClick={() => setActiveSport(sp)}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
        <div className={s.eventsScroll}>
          {filtered.map((evt) => (
            <div key={evt.id} className={`${s.eventCard} ${evt.live ? s.eventCardLive : ''}`}>
              <div className={s.eventSport}>{evt.sport}</div>
              <div className={s.eventMatchup}>{evt.matchup}</div>
              {evt.live ? (
                <div className={s.eventLiveBadge}>
                  <div className={s.liveDot} /> LIVE
                </div>
              ) : (
                <div className={s.eventTime}>{evt.time}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySwitchSection() {
  const t = useT();

  return (
    <section className={s.section}>
      <div className={s.sectionInner}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t('landing.whySwitch.title', 'Why Creators Are Switching')}</h2>
          <p className={s.sectionSubtitle}>
            {t('landing.whySwitch.subtitle', 'Other platforms treat picks like tweets. We treat them like a portfolio.')}
          </p>
        </div>
        <div className={s.painGrid}>
          {PAIN_POINTS.map((pain) => (
            <div key={pain.id} className={s.painCard}>
              <div className={s.painCardIcon}>{pain.icon}</div>
              <h3 className={s.painCardTitle}>{t(pain.titleKey, pain.titleDefault)}</h3>
              <p className={s.painCardBody}>{t(pain.bodyKey, pain.bodyDefault)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsSection() {
  const t = useT();

  return (
    <section className={s.sectionAlt}>
      <div className={s.sectionInner}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t('landing.tools.title', 'Professional Creator Tools')}</h2>
          <p className={s.sectionSubtitle}>
            {t('landing.tools.subtitle', 'Everything you need to run your picks business, built into one platform.')}
          </p>
        </div>
        <div className={s.toolsGrid}>
          {TOOLS.map((tool) => (
            <div key={tool.id} className={s.toolCard}>
              <div className={s.toolIcon}>{tool.icon}</div>
              <h3 className={s.toolTitle}>{t(tool.titleKey, tool.titleDefault)}</h3>
              <p className={s.toolDesc}>{t(tool.descKey, tool.descDefault)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformPreviewSection() {
  const t = useT();

  return (
    <section className={s.section}>
      <div className={s.sectionInner}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t('landing.preview.title', 'See Your Business at a Glance')}</h2>
          <p className={s.sectionSubtitle}>
            {t('landing.preview.subtitle', 'Revenue tracking, subscriber analytics, and performance metrics \u2014 all in one dashboard.')}
          </p>
        </div>
        <div className={s.previewContainer}>
          <div className={s.previewText}>
            <h3 className={s.previewTitle}>{t('landing.preview.dashboardTitle', 'Revenue Dashboard')}</h3>
            <p className={s.previewDesc}>
              {t('landing.preview.dashboardDesc', 'Track MRR, subscriber churn, and revenue per pick in real-time. Know exactly how your business is performing.')}
            </p>
          </div>
          <div className={s.previewMockup}>
            <div className={s.mockupBar}>
              <div className={s.mockupDot} />
              <div className={s.mockupDot} />
              <div className={s.mockupDot} />
            </div>
            <div className={s.mockupContent}>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>MRR</span>
                <span className={s.mockupValue}>$4,280</span>
                <div className={s.mockupBarGraph} style={{ width: '70%' }} />
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Subscribers</span>
                <span className={s.mockupValue}>142</span>
                <div className={s.mockupBarGraph} style={{ width: '55%' }} />
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Win Rate</span>
                <span className={s.mockupValue}>62.4%</span>
                <div className={s.mockupBarGraph} style={{ width: '62%' }} />
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>ROI</span>
                <span className={s.mockupValue}>+18.7%</span>
                <div className={s.mockupBarGraph} style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandCenterSection() {
  const t = useT();

  return (
    <section className={s.sectionAlt}>
      <div className={s.sectionInner}>
        <div className={s.previewContainer}>
          <div className={s.previewMockup}>
            <div className={s.mockupBar}>
              <div className={s.mockupDot} />
              <div className={s.mockupDot} />
              <div className={s.mockupDot} />
            </div>
            <div className={s.mockupContent}>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Active Picks</span>
                <span className={s.mockupValue}>7</span>
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Today&apos;s P/L</span>
                <span className={s.mockupValue}>+3.2u</span>
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Streak</span>
                <span className={s.mockupValue}>5W</span>
              </div>
              <div className={s.mockupRow}>
                <span className={s.mockupLabel}>Pending</span>
                <span className={s.mockupValue}>3 picks</span>
              </div>
            </div>
          </div>
          <div className={s.previewText}>
            <h3 className={s.previewTitle}>{t('landing.commandCenter.title', 'Your Command Center')}</h3>
            <p className={s.previewDesc}>
              {t('landing.commandCenter.desc', 'Manage active picks, monitor results in real-time, broadcast to subscribers, and track your daily P/L \u2014 all from one control room.')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorDiscoverySection() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <section className={s.section}>
      <div className={s.sectionInner}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t('landing.creators.title', 'Discover Top Creators')}</h2>
          <p className={s.sectionSubtitle}>
            {t('landing.creators.subtitle', 'Browse verified creators ranked by real performance. Every stat is tracked and audited.')}
          </p>
        </div>
        <div className={s.creatorsGrid}>
          {FEATURED_CREATORS.map((creator) => (
            <div
              key={creator.id}
              className={s.creatorCard}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/creator/${creator.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/creator/${creator.id}`); }}
            >
              <div className={s.creatorCardHeader}>
                <div className={s.creatorAvatar}>{getInitials(creator.name)}</div>
                <div>
                  <div className={s.creatorName}>{creator.name}</div>
                  <div className={s.creatorSport}>{creator.record}</div>
                </div>
              </div>
              <div className={s.creatorStatsRow}>
                <div className={s.creatorStat}>
                  <div className={`${s.creatorStatValue} ${s.roiPositive}`}>{creator.roi}</div>
                  <div className={s.creatorStatLabel}>ROI</div>
                </div>
                <div className={s.creatorStat}>
                  <div className={s.creatorStatValue}>{creator.winRate}</div>
                  <div className={s.creatorStatLabel}>{t('landing.creators.winRate', 'Win Rate')}</div>
                </div>
                <div className={s.creatorStat}>
                  <div className={s.creatorStatValue}>{creator.picks}</div>
                  <div className={s.creatorStatLabel}>{t('landing.creators.picks', 'Picks')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--ds-size-6)' }}>
          <Button onClick={() => navigate('/leaderboard')} variant="secondary" data-size="md">
            {t('landing.creators.viewAll', 'View Full Leaderboard')}
          </Button>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const t = useT();

  return (
    <section className={s.sectionAlt}>
      <div className={s.sectionInner}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t('landing.testimonials.title', 'What They Say')}</h2>
        </div>
        <div className={s.testimonialsGrid}>
          {TESTIMONIALS.map((item) => (
            <div key={item.id} className={s.testimonialCard}>
              <p className={s.testimonialQuote}>&ldquo;{item.quote}&rdquo;</p>
              <div className={s.testimonialAuthor}>
                <div className={s.testimonialAvatar}>{item.initials}</div>
                <div>
                  <div className={s.testimonialName}>{item.name}</div>
                  <div className={s.testimonialRole}>{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  const t = useT();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className={s.finalCta}>
      <div className={s.finalCtaInner}>
        <h2 className={s.finalCtaTitle}>
          {t('landing.finalCta.title', "IF YOU'RE READY TO BUILD PROPERLY")}
        </h2>
        <p className={s.finalCtaSubtitle}>
          {t('landing.finalCta.subtitle', 'EdgePicks is invite-only. Every application is manually reviewed. We only onboard creators who are serious about their craft.')}
        </p>
        <div className={s.finalCtaActions}>
          {!isAuthenticated ? (
            <>
              <Button onClick={() => navigate('/register')} data-size="lg" color="accent">
                {t('landing.finalCta.cta', 'Apply for Access')}
              </Button>
              <Button onClick={() => navigate('/pricing')} data-size="lg" variant="secondary">
                {t('landing.finalCta.ctaPricing', 'View Plans')}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => { window.location.href = String(import.meta.env.VITE_DASHBOARD_URL || '/min-side'); }}
              data-size="lg"
              color="accent"
            >
              {t('landing.finalCta.ctaDashboard', 'Go to Dashboard')}
            </Button>
          )}
        </div>
        <p className={s.finalCtaNote}>
          {t('landing.finalCta.note', 'All applications are reviewed within 48 hours.')}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ListingsPage(): React.ReactElement {
  return (
    <>
      <HeroSection />
      <LiveEventsStrip />
      <WhySwitchSection />
      <ToolsSection />
      <PlatformPreviewSection />
      <CommandCenterSection />
      <CreatorDiscoverySection />
      <TestimonialsSection />
      <FinalCtaSection />
    </>
  );
}
