/**
 * SlotGrid Component
 *
 * A reusable time×days (or rows×columns) grid for selecting slots.
 * Uses role="grid" for accessibility. Replaces raw table markup.
 *
 * @example Weekly slot picker
 * ```tsx
 * <SlotGrid
 *   columnHeaders={[
 *     { id: 'mon', label: 'Man', subLabel: '13' },
 *     { id: 'tue', label: 'Tir', subLabel: '14' },
 *   ]}
 *   rowHeaders={[8, 9, 10].map(h => ({ id: h, label: `${h}:00` }))}
 *   getCellStatus={(colId, rowId) => 'available'}
 *   isCellSelected={(colId, rowId) => false}
 *   onCellClick={(colId, rowId) => {}}
 *   ariaLabel="Ukentlig timeplan"
 * />
 * ```
 */

import * as React from 'react';
import { Button, Paragraph, Spinner } from '@digdir/designsystemet-react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../primitives/icons';
import { cn } from '../../utils';
import styles from './SlotGrid.module.css';

export type SlotStatus = 'available' | 'booked' | 'closed' | 'blocked';

export interface SlotGridColumnHeader {
  id: string;
  label: string;
  subLabel?: string;
}

export interface SlotGridRowHeader {
  id: string | number;
  label: string;
}

export type SlotGridLegendStatus = SlotStatus | 'selected';

export interface SlotGridLegendItem {
  status: SlotGridLegendStatus;
  label: string;
}

export interface SlotGridProps {
  columnHeaders: SlotGridColumnHeader[];
  rowHeaders: SlotGridRowHeader[];
  getCellStatus: (colId: string, rowId: string | number) => SlotStatus;
  isCellSelected: (colId: string, rowId: string | number) => boolean;
  onCellClick: (colId: string, rowId: string | number) => void;
  ariaLabel: string;
  isLoading?: boolean;
  legendItems?: SlotGridLegendItem[];
  summary?: React.ReactNode;
  header?: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  navLabel?: string;
  className?: string;
  stickyFirstColumn?: boolean;
}

function getCellStatusClass(status: SlotStatus): string {
  switch (status) {
    case 'available':
      return styles.slotGrid__cell_available;
    case 'booked':
      return styles.slotGrid__cell_booked;
    case 'closed':
      return styles.slotGrid__cell_closed;
    case 'blocked':
      return styles.slotGrid__cell_blocked;
  }
}

const STATUS_LABELS: Record<SlotStatus, string> = {
  available: 'ledig',
  booked: 'opptatt',
  closed: 'stengt',
  blocked: 'blokkert',
};

export function SlotGrid({
  columnHeaders,
  rowHeaders,
  getCellStatus,
  isCellSelected,
  onCellClick,
  ariaLabel,
  isLoading = false,
  legendItems,
  summary,
  header,
  onPrev,
  onNext,
  navLabel,
  className,
  stickyFirstColumn = true,
}: SlotGridProps): React.ReactElement {
  const colIds = columnHeaders.map((c) => c.id);

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    colId: string,
    rowId: string | number
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const status = getCellStatus(colId, rowId);
      if (status === 'available') {
        onCellClick(colId, rowId);
      }
    }
  };

  const numCols = columnHeaders.length;

  return (
    <div className={cn(styles.slotGrid, className)}>
      {/* Header: custom or built-in nav */}
      {header ?? (onPrev != null || onNext != null) ? (
        <div className={styles.slotGrid__header}>
          {header ?? (
            <>
              {onPrev && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onPrev}
                  aria-label="Forrige"
                  className={styles.slotGrid__navBtn}
                >
                  <ChevronLeftIcon size={20} aria-hidden />
                </Button>
              )}
              {navLabel && (
                <span className={styles.slotGrid__navLabel}>{navLabel}</span>
              )}
              {onNext && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onNext}
                  aria-label="Neste"
                  className={styles.slotGrid__navBtn}
                >
                  <ChevronRightIcon size={20} aria-hidden />
                </Button>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Grid container with scroll */}
      <div
        className={styles.slotGrid__scroll}
        style={{ '--slot-grid-cols': numCols } as React.CSSProperties}
      >
        <div
          role="grid"
          aria-label={ariaLabel}
          className={styles.slotGrid__grid}
        >
          {/* Corner cell */}
          <div
            className={cn(
              styles.slotGrid__headerCell,
              styles.slotGrid__headerCell_time,
              stickyFirstColumn && styles.slotGrid__headerCell_sticky
            )}
            role="columnheader"
          >
            Tid
          </div>
          {/* Column headers */}
          {columnHeaders.map((col) => (
            <div
              key={col.id}
              className={cn(
                styles.slotGrid__headerCell,
                styles.slotGrid__headerCell_day
              )}
              role="columnheader"
            >
              <span className={styles.slotGrid__dayName}>{col.label}</span>
              {col.subLabel && (
                <span className={styles.slotGrid__dayDate}>{col.subLabel}</span>
              )}
            </div>
          ))}

          {/* Rows */}
          {rowHeaders.map((row) => (
            <React.Fragment key={String(row.id)}>
              {/* Row header (time) */}
              <div
                className={cn(
                  styles.slotGrid__rowHeader,
                  stickyFirstColumn && styles.slotGrid__rowHeader_sticky
                )}
                role="rowheader"
              >
                {row.label}
              </div>
              {/* Cells */}
              {colIds.map((colId) => {
                const status = getCellStatus(colId, row.id);
                const selected = isCellSelected(colId, row.id);
                const clickable = status === 'available';
                const col = columnHeaders.find((c) => c.id === colId);
                const statusLabel =
                  STATUS_LABELS[status] ?? status;
                const ariaLabelStr = col
                  ? `${row.label}, ${col.label} ${col.subLabel ?? ''}, ${statusLabel}${selected ? ', valgt' : ''}`
                  : `${row.label}, ${colId}, ${statusLabel}`;

                return (
                  <div
                    key={`${colId}-${row.id}`}
                    role="gridcell"
                    aria-selected={selected}
                    aria-disabled={!clickable}
                    aria-label={ariaLabelStr.trim()}
                    tabIndex={clickable ? 0 : -1}
                    className={cn(
                      styles.slotGrid__cell,
                      getCellStatusClass(status),
                      selected && styles.slotGrid__cell_selected
                    )}
                    onClick={() => clickable && onCellClick(colId, row.id)}
                    onKeyDown={(e) =>
                      handleCellKeyDown(e, colId, row.id)
                    }
                  >
                    {status === 'booked' && (
                      <span className={styles.slotGrid__icon} aria-hidden>
                        ●
                      </span>
                    )}
                    {selected && (
                      <span className={styles.slotGrid__icon} aria-hidden>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {isLoading && (
          <div className={styles.slotGrid__loading} role="status" aria-live="polite">
            <Spinner data-size="sm" aria-label="Laster" />
            <Paragraph data-size="sm" style={{ margin: 0 }}>
              Laster tilgjengelighet...
            </Paragraph>
          </div>
        )}
      </div>

      {/* Legend */}
      {legendItems && legendItems.length > 0 && (
        <div className={styles.slotGrid__legend} aria-label="Forklaring">
          {legendItems.map(({ status, label }) => (
            <div key={status} className={styles.slotGrid__legendItem}>
              <span
                className={cn(
                  styles.slotGrid__legendBox,
                  status === 'available' && styles.slotGrid__legendBox_available,
                  status === 'booked' && styles.slotGrid__legendBox_booked,
                  status === 'selected' && styles.slotGrid__legendBox_selected,
                  status === 'closed' && styles.slotGrid__legendBox_closed,
                  status === 'blocked' && styles.slotGrid__legendBox_blocked
                )}
                aria-hidden
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className={styles.slotGrid__summary} role="status" aria-live="polite">
          {summary}
        </div>
      )}
    </div>
  );
}
