/**
 * SavedPicksPage — Web App
 *
 * Unified library for a subscriber's saved content:
 * - Tailed Picks: picks the user has tailed (backed by pickTails system)
 * - Favorites: bookmarked resources (backed by favorites/user-prefs)
 *
 * Uses existing SDK hooks — no new backend work required.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Stack, NativeSelect, StatusTag } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useMyTailedPicks, useUntailPick } from '@digipicks/sdk';
import type { TailedPick } from '@digipicks/sdk';
import { useAuth, env } from '@digipicks/app-shell';
import { useFavorites } from '@digipicks/sdk';
import s from './saved-picks.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORTS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF'];

type TabId = 'picks' | 'favorites';

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Tailed Pick Row
// ---------------------------------------------------------------------------

function TailedPickRow({ pick, onUntail }: { pick: TailedPick; onUntail: (id: string) => void }) {
  return (
    <Card className={s.pickCard}>
      <div className={s.pickMain}>
        <div className={s.pickEvent}>
          <Link to={`/creator/${pick.creatorId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {pick.creator?.displayName || pick.creator?.name || 'Unknown'}
          </Link>
          {' — '}
          {pick.event}
        </div>
        <div className={s.pickMeta}>
          <StatusTag color="neutral" data-size="sm">{pick.sport}</StatusTag>
          <StatusTag color="neutral" data-size="sm">{pick.pickType}</StatusTag>
          {pick.selection && <span>{pick.selection}</span>}
          {pick.oddsAmerican && <span>{pick.oddsAmerican}</span>}
          {pick.units && <span>{pick.units}u</span>}
          <span>{formatDate(pick.tailedAt)}</span>
        </div>
      </div>
      <StatusTag color={resultColor(pick.result)} data-size="sm">
        {pick.result.toUpperCase()}
      </StatusTag>
      <div className={s.pickActions}>
        <Button data-size="sm" variant="tertiary" onClick={() => onUntail(pick.id)}>
          Untail
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Favorite Card
// ---------------------------------------------------------------------------

function FavoriteCard({ resourceId, addedAt, onRemove }: {
  resourceId: string;
  addedAt: number;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className={s.favoriteCard}>
      <div className={s.favoriteHeader}>
        <span className={s.favoriteName}>{resourceId}</span>
        <span className={s.favoriteDate}>{formatDate(addedAt)}</span>
      </div>
      <Button data-size="sm" variant="tertiary" color="danger" onClick={() => onRemove(resourceId)}>
        Remove
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SavedPicksPage() {
  const t = useT();
  const navigate = useNavigate();
  const auth = useAuth();
  const tenantId = env.tenantId as string | undefined;
  const userId = auth.user?.id;

  const [activeTab, setActiveTab] = useState<TabId>('picks');
  const [sportFilter, setSportFilter] = useState('All');

  // Tailed picks
  const filterParams = useMemo(
    () => ({ sport: sportFilter !== 'All' ? sportFilter : undefined }),
    [sportFilter],
  );
  const { picks, isLoading: picksLoading } = useMyTailedPicks(tenantId as any, userId, filterParams);
  const { mutateAsync: untailAsync } = useUntailPick();

  // Favorites
  const { favorites, removeFavorite, isLoading: favsLoading, count: favsCount } = useFavorites({
    userId,
    tenantId,
  });

  const handleUntail = async (pickId: string) => {
    if (!userId) return;
    try {
      await untailAsync({ userId: userId as any, pickId });
    } catch {
      // Convex updates reactively
    }
  };

  const handleRemoveFavorite = async (resourceId: string) => {
    try {
      await removeFavorite(resourceId);
    } catch {
      // handled reactively
    }
  };

  // Not logged in
  if (!auth.isAuthenticated) {
    return (
      <div className={s.pageContainer}>
        <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
          <Heading level={1} data-size="lg" className={s.title}>
            {t('picks.saved.title', 'Saved Picks')}
          </Heading>
        </Stack>
        <div className={s.loginPrompt}>
          <Paragraph className={s.loginPromptText}>
            {t('picks.saved.loginPrompt', 'Sign in to see your saved picks, favorites, and followed creators.')}
          </Paragraph>
          <Button data-size="sm" variant="primary" onClick={() => navigate('/login')}>
            {t('common.signIn', 'Sign In')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <Stack direction="vertical" spacing="var(--ds-size-2)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('picks.saved.title', 'Saved Picks')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('picks.saved.subtitle', 'Your library of tailed picks and bookmarked content')}
        </Paragraph>
      </Stack>

      {/* Summary stats */}
      <div className={s.statsRow}>
        <Card className={s.statCard}>
          <div className={s.statLabel}>{t('picks.saved.tailedPicks', 'Tailed Picks')}</div>
          <div className={s.statValue}>{picks.length}</div>
        </Card>
        <Card className={s.statCard}>
          <div className={s.statLabel}>{t('picks.saved.favorites', 'Favorites')}</div>
          <div className={s.statValue}>{favsCount}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button
          className={`${s.tab} ${activeTab === 'picks' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('picks')}
        >
          {t('picks.saved.tabPicks', 'Tailed Picks')} ({picks.length})
        </button>
        <button
          className={`${s.tab} ${activeTab === 'favorites' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          {t('picks.saved.tabFavorites', 'Favorites')} ({favsCount})
        </button>
      </div>

      {/* Tailed Picks Tab */}
      {activeTab === 'picks' && (
        <>
          <div className={s.filterRow}>
            <NativeSelect
              label={t('picks.feed.filterSport', 'Sport')}
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className={s.filterSelect}
              data-size="sm"
            >
              {SPORTS.map((sport) => (
                <option key={sport} value={sport}>
                  {sport === 'All' ? t('common.all', 'All Sports') : sport}
                </option>
              ))}
            </NativeSelect>
          </div>

          {picksLoading ? (
            <Paragraph>{t('common.loading', 'Loading...')}</Paragraph>
          ) : picks.length === 0 ? (
            <div className={s.emptyState}>
              <Paragraph className={s.emptyText}>
                {t('picks.saved.emptyPicks', "You haven't tailed any picks yet. Browse the feed to find picks to tail.")}
              </Paragraph>
              <Button data-size="sm" variant="secondary" onClick={() => navigate('/picks')}>
                {t('picks.saved.browsePicks', 'Browse Picks')}
              </Button>
            </div>
          ) : (
            <div className={s.pickGrid}>
              {picks.map((pick) => (
                <TailedPickRow key={pick.id} pick={pick} onUntail={handleUntail} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <>
          {favsLoading ? (
            <Paragraph>{t('common.loading', 'Loading...')}</Paragraph>
          ) : favorites.length === 0 ? (
            <div className={s.emptyState}>
              <Paragraph className={s.emptyText}>
                {t('picks.saved.emptyFavorites', "You haven't bookmarked anything yet. Tap the heart icon on any listing to save it.")}
              </Paragraph>
              <Button data-size="sm" variant="secondary" onClick={() => navigate('/')}>
                {t('picks.saved.browseListings', 'Browse Listings')}
              </Button>
            </div>
          ) : (
            <div className={s.favoritesGrid}>
              {favorites.map((fav) => (
                <FavoriteCard
                  key={fav.resourceId}
                  resourceId={fav.resourceId}
                  addedAt={fav.addedAt}
                  onRemove={handleRemoveFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
