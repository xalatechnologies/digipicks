/**
 * CrudStatGrid
 *
 * Responsive grid of KPI stat cards. Each card renders an icon, label, and
 * formatted value inside a Card. Follows the form-builder / billing / overview
 * stat card pattern used across backoffice and saas-admin.
 *
 * @example
 * <CrudStatGrid stats={[
 *   { icon: <EditIcon />, label: 'Total forms', value: 42, variant: 'accent' },
 *   { icon: <CheckCircleIcon />, label: 'Published', value: 38, variant: 'success' },
 * ]} />
 */

import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../../utils';
import styles from './CrudStatGrid.module.css';

import { IconBox } from '../utility/IconBox';

export interface CrudStat {
  /** Icon element (e.g. <EditIcon />) */
  icon: React.ReactNode;
  /** Short label (e.g. "Total forms") */
  label: string;
  /** Numeric or string value */
  value: string | number;
  /** Optional description below the value */
  description?: string;
  /** IconBox color variant */
  variant?: 'accent' | 'success' | 'warning' | 'neutral' | 'danger';
  /** Click handler — makes the card interactive */
  onClick?: () => void;
}

export interface CrudStatGridProps {
  /** Array of stat items to render */
  stats: CrudStat[];
  /** Override grid-template-columns (default: responsive based on stat count) */
  columns?: string;
  /** Locale for number formatting @default 'nb-NO' */
  locale?: string;
  /** Additional class name */
  className?: string;
}

export function CrudStatGrid({
  stats,
  columns,
  locale = 'nb-NO',
  className,
}: CrudStatGridProps): React.ReactElement {
  const gridColumns =
    columns ??
    (stats.length <= 2
      ? `repeat(${stats.length}, 1fr)`
      : stats.length === 3
        ? 'repeat(3, 1fr)'
        : `repeat(${Math.min(stats.length, 4)}, 1fr)`);

  return (
    <div
      className={cn(styles.grid, className)}
      style={{ gridTemplateColumns: gridColumns }}
    >
      {stats.map((stat) => (
        <Card
          key={stat.label}
          data-color="neutral"
          className={cn(styles.card, stat.onClick && styles.clickable)}
          onClick={stat.onClick}
          role={stat.onClick ? 'button' : undefined}
          tabIndex={stat.onClick ? 0 : undefined}
          onKeyDown={
            stat.onClick
              ? (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    stat.onClick?.();
                  }
                }
              : undefined
          }
        >
          <div className={styles.inner}>
            <IconBox
              icon={stat.icon}
              variant={stat.variant ?? 'neutral'}
              size="md"
            />
            <div className={styles.text}>
              <Paragraph data-size="xs" className={styles.label}>
                {stat.label}
              </Paragraph>
              <Heading level={3} data-size="lg" className={styles.value}>
                {typeof stat.value === 'number'
                  ? stat.value.toLocaleString(locale)
                  : stat.value}
              </Heading>
              {stat.description && (
                <Paragraph data-size="xs" className={styles.description}>
                  {stat.description}
                </Paragraph>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

CrudStatGrid.displayName = 'CrudStatGrid';
