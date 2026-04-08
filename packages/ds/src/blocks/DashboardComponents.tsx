/**
 * Dashboard Components
 *
 * Reusable components for admin dashboards including
 * stat cards, activity feeds, and quick actions.
 */
import * as React from 'react';
import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { TrendUpIcon, TrendDownIcon } from '../primitives/icons';
import { cn } from '../utils';
import { StatusTag, type BadgeColor } from './StatusBadges';
import styles from './DashboardComponents.module.css';

// =============================================================================
// StatCard - KPI/Metric Display Card
// =============================================================================

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Optional description text */
  description?: string;
  /** Optional accent color (dynamic — kept as inline style) */
  color?: string;
  /** Optional trend indicator */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Optional icon */
  icon?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Optional click handler to make card interactive */
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  description,
  color,
  trend,
  icon,
  className,
  onClick,
}: StatCardProps): React.ReactElement {
  return (
    <Card
      className={cn(styles.statCard, onClick && styles.statCardClickable, className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <Stack direction="horizontal" justify="between" align="start">
        <Paragraph data-size="sm" className={styles.statCardHeader}>
          {title}
        </Paragraph>
        {icon && (
          <div
            className={styles.statCardIconWrap}
            style={color ? { color } : undefined}
          >
            {icon}
          </div>
        )}
      </Stack>

      <Stack direction="horizontal" spacing="var(--ds-size-3)" align="end">
        <Heading
          level={3}
          data-size="2xl"
          className={styles.statCardValue}
          style={color ? { color } : undefined}
        >
          {value}
        </Heading>
        {trend && (
          <span className={trend.isPositive ? styles.statCardTrendPositive : styles.statCardTrendNegative}>
            {trend.isPositive ? <TrendUpIcon size={16} /> : <TrendDownIcon size={16} />}
            {trend.value}%
          </span>
        )}
      </Stack>

      {description && (
        <Paragraph data-size="xs" className={styles.statCardDescription}>
          {description}
        </Paragraph>
      )}
    </Card>
  );
}

// =============================================================================
// ActivityItem - Activity Feed Item
// =============================================================================

export type ActivityStatus = 'pending' | 'approved' | 'rejected';

export interface ActivityItemProps {
  /** Activity title */
  title: string;
  /** Activity description */
  description: string;
  /** Time string (e.g., "For 5 minutter siden") */
  time: string;
  /** Activity status */
  status: ActivityStatus;
  /** Custom class name */
  className?: string;
  /** Optional click handler to make activity item interactive */
  onClick?: () => void;
}

const statusColors: Record<ActivityStatus, string> = {
  pending: 'var(--ds-color-warning-text-default)',
  approved: 'var(--ds-color-success-text-default)',
  rejected: 'var(--ds-color-danger-text-default)',
};

const statusLabels: Record<ActivityStatus, string> = {
  pending: 'Venter',
  approved: 'Godkjent',
  rejected: 'Avslått',
};

const statusBadgeColors: Record<ActivityStatus, BadgeColor> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function ActivityItem({
  title,
  description,
  time,
  status,
  className,
  onClick,
}: ActivityItemProps): React.ReactElement {
  const badgeColor = statusBadgeColors[status];

  return (
    <Stack
      direction="horizontal"
      spacing="var(--ds-size-4)"
      align="start"
      className={cn(styles.activityItem, onClick && styles.activityItemClickable, className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <div
        className={styles.activityDot}
        style={{ backgroundColor: statusColors[status] }}
      />
      <Stack spacing="0" className={styles.activityContent}>
        <Stack direction="horizontal" justify="between" align="start" spacing="var(--ds-size-2)">
          <Paragraph data-size="sm" className={styles.activityTitle}>
            {title}
          </Paragraph>
          <StatusTag color={badgeColor} size="sm">
            {statusLabels[status]}
          </StatusTag>
        </Stack>
        <Paragraph data-size="xs" className={styles.activityDescription}>
          {description}
        </Paragraph>
        <Paragraph data-size="xs" className={styles.activityTime}>
          {time}
        </Paragraph>
      </Stack>
    </Stack>
  );
}

// =============================================================================
// ActivityFeed - Container for Activity Items
// =============================================================================

export interface ActivityFeedProps {
  /** Activity items */
  children: React.ReactNode;
  /** Optional title */
  title?: string;
  /** Custom class name */
  className?: string;
}

export function ActivityFeed({
  children,
  title,
  className,
}: ActivityFeedProps): React.ReactElement {
  return (
    <div className={cn('activity-feed', className)}>
      {title && (
        <Heading level={3} data-size="sm" className={styles.feedTitle}>
          {title}
        </Heading>
      )}
      <Stack spacing="var(--ds-size-3)">
        {children}
      </Stack>
    </div>
  );
}

// =============================================================================
// QuickActionCard - Quick action button card
// =============================================================================

export interface QuickActionProps {
  /** Action title */
  title: string;
  /** Action description */
  description?: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  className,
}: QuickActionProps): React.ReactElement {
  return (
    <Card
      className={cn(disabled ? styles.quickActionDisabled : styles.quickAction, className)}
      onClick={disabled ? undefined : onClick}
    >
      <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
        <div className={styles.quickActionIconWrap}>
          {icon}
        </div>
        <Stack spacing="0">
          <Paragraph data-size="sm" className={styles.quickActionTitle}>
            {title}
          </Paragraph>
          {description && (
            <Paragraph data-size="xs" className={styles.quickActionDescription}>
              {description}
            </Paragraph>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a date string to a relative time string (Norwegian)
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Akkurat nå';
  if (diffMins < 60) return `For ${diffMins} minutt${diffMins === 1 ? '' : 'er'} siden`;
  if (diffHours < 24) return `For ${diffHours} time${diffHours === 1 ? '' : 'r'} siden`;
  return `For ${diffDays} dag${diffDays === 1 ? '' : 'er'} siden`;
}

export default StatCard;
