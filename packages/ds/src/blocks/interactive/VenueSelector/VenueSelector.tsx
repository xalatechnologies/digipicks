/**
 * VenueSelector — Card grid for selecting a venue.
 * Supports an optional "All" card, images, and single-select highlighting.
 */

import type { ReactNode } from 'react';
import styles from './VenueSelector.module.css';

export interface VenueSelectorItem {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface VenueSelectorProps {
  venues: VenueSelectorItem[];
  selectedId?: string;
  onChange: (id: string | undefined) => void;
  /** Show an "All" card as the first option (default true) */
  showAllOption?: boolean;
  /** Label for the "All" card (default "Alle") */
  allLabel?: string;
  /** Icon rendered inside the "All" card */
  allIcon?: ReactNode;
}

export function VenueSelector({
  venues,
  selectedId,
  onChange,
  showAllOption = true,
  allLabel = 'Alle',
  allIcon,
}: VenueSelectorProps) {
  return (
    <div className={styles.grid}>
      {showAllOption && (
        <button
          type="button"
          className={styles.allCard}
          data-selected={!selectedId}
          aria-pressed={!selectedId}
          onClick={() => onChange(undefined)}
        >
          <div className={styles.allIcon}>
            {allIcon ?? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            )}
          </div>
          <span className={styles.cardName}>{allLabel}</span>
        </button>
      )}

      {venues.map((venue) => {
        const isSelected = selectedId === venue.id;
        return (
          <button
            key={venue.id}
            type="button"
            className={styles.card}
            data-selected={isSelected}
            aria-pressed={isSelected}
            onClick={() => onChange(venue.id)}
          >
            {venue.imageUrl && (
              <div className={styles.cardImage}>
                <img src={venue.imageUrl} alt={venue.name} />
              </div>
            )}
            <div className={styles.cardContent}>
              <span className={styles.cardName}>{venue.name}</span>
              {venue.subtitle && (
                <span className={styles.cardSubtitle}>{venue.subtitle}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
