/**
 * BadgeRow
 *
 * Displays a horizontal row of badges with optional icons and labels.
 * Generic, reusable block — consumer provides icons via ReactNode.
 *
 * @example
 * ```tsx
 * import { BadgeRow, UsersIcon, ClockIcon } from '@digipicks/ds';
 *
 * <BadgeRow
 *   badges={[
 *     { icon: <UsersIcon size={14} />, label: 'Capacity: 50' },
 *     { icon: <ClockIcon size={14} />, label: '08:00 - 22:00' },
 *   ]}
 * />
 * ```
 */
import * as React from 'react';
import { Tag } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';

// =============================================================================
// Types
// =============================================================================

export interface BadgeItem {
  /** Optional icon element (consumer provides) */
  icon?: React.ReactNode;
  /** Badge label text */
  label: string;
  /** Optional variant override */
  variant?: 'neutral' | 'success' | 'info' | 'warning';
}

export interface BadgeRowProps {
  /** Array of badges to display */
  badges: BadgeItem[];
  /** Allow wrapping to multiple lines */
  wrap?: boolean;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Spacing between badges (default: var(--ds-size-2)) */
  spacing?: string | number;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BadgeRow({
  badges,
  wrap = true,
  size = 'sm',
  spacing = 'var(--ds-size-2)',
  className,
}: BadgeRowProps): React.ReactElement {
  return (
    <Stack direction="horizontal" spacing={spacing} wrap={wrap} align="center" className={cn('badge-row', className)}>
      {badges.map((badge, index) => (
        <Tag key={`badge-${index}`} data-color={badge.variant || 'neutral'} data-size={size}>
          {badge.icon}
          {badge.label}
        </Tag>
      ))}
    </Stack>
  );
}
