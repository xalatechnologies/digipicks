/**
 * DashboardHeader
 *
 * Config-driven 3-zone header for dashboard apps.
 * Apps pass leftSlot, centerSlot (search), rightSlot (actions, user menu).
 * Structure and styles from DS; no layout components in apps.
 */

import { cn } from '../../../utils';
import styles from './DashboardHeader.module.css';

export interface DashboardHeaderProps {
  /** Left zone content (e.g. logo, account switcher) */
  leftSlot?: React.ReactNode;
  /** Center zone (typically search) */
  centerSlot?: React.ReactNode;
  /** Right zone (theme toggle, notifications, settings, user menu) */
  rightSlot?: React.ReactNode;
  /** Optional id for skip links / a11y */
  id?: string;
  /** Optional class name */
  className?: string;
}

export function DashboardHeader({
  leftSlot,
  centerSlot,
  rightSlot,
  id,
  className,
}: DashboardHeaderProps): React.ReactElement {
  return (
    <header id={id} className={cn(styles.header, className)}>
      <div className={styles.container}>
        <div className={styles.leftSlot}>{leftSlot}</div>
        <div className={styles.centerSlot}>{centerSlot}</div>
        <div className={styles.rightSlot}>{rightSlot}</div>
      </div>
    </header>
  );
}

DashboardHeader.displayName = 'DashboardHeader';
