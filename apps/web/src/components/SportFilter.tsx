/**
 * SportFilter — Horizontal scrollable chip bar for sport-based filtering.
 *
 * Renders each sport as a clickable chip. The active sport is highlighted.
 * Designed for use on creator discovery and picks feed pages.
 * Syncs with URL search params when used with useSearchParams.
 */

import { useT } from '@digilist-saas/i18n';
import s from './SportFilter.module.css';

export const SPORTS = [
  'All',
  'NBA',
  'NFL',
  'MLB',
  'NHL',
  'Soccer',
  'UFC',
  'Tennis',
  'Golf',
  'NCAAB',
  'NCAAF',
] as const;

export type SportValue = (typeof SPORTS)[number];

/** i18n keys for sport display names */
const SPORT_KEYS: Record<string, string> = {
  All: 'sport.all',
  NBA: 'sport.nba',
  NFL: 'sport.nfl',
  MLB: 'sport.mlb',
  NHL: 'sport.nhl',
  Soccer: 'sport.soccer',
  UFC: 'sport.ufc',
  Tennis: 'sport.tennis',
  Golf: 'sport.golf',
  NCAAB: 'sport.ncaab',
  NCAAF: 'sport.ncaaf',
};

interface SportFilterProps {
  value: string;
  onChange: (sport: string) => void;
}

export function SportFilter({ value, onChange }: SportFilterProps) {
  const t = useT();

  return (
    <div className={s.sportFilterBar} role="tablist" aria-label={t('sport.filterLabel', 'Filter by sport')}>
      {SPORTS.map((sport) => {
        const isActive = value === sport;
        return (
          <button
            key={sport}
            role="tab"
            aria-selected={isActive}
            className={`${s.sportChip} ${isActive ? s.sportChipActive : ''}`}
            onClick={() => onChange(sport)}
            type="button"
          >
            {t(SPORT_KEYS[sport], sport === 'All' ? 'All Sports' : sport)}
          </button>
        );
      })}
    </div>
  );
}
