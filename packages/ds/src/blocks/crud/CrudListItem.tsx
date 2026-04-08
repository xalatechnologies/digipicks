/**
 * CrudListItem
 *
 * Reusable card-style list item for CRUD list views. Renders an avatar/icon,
 * title + subtitle, status badge, tags, description, footer, and action menu.
 * Follows the tenants / users / bookings list item pattern.
 *
 * @example
 * <CrudListItem
 *   avatar={<CrudListItem.Avatar initials="SK" />}
 *   title="Steinkjer Kommune"
 *   subtitle="steinkjer"
 *   status={{ status: 'success', label: 'Active' }}
 *   tags={[{ label: 'Enterprise' }]}
 *   description="Kulturhus og idrettsanlegg"
 *   footer={<Paragraph data-size="xs">24 users</Paragraph>}
 *   actions={[{ label: 'Edit', icon: <EditIcon />, onClick: () => {} }]}
 *   onClick={() => navigate('/tenants/1')}
 * />
 */

import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { cn } from '../../utils';
import { StatusTag } from '../StatusBadges';
import { ActionMenu } from '../interactive/ActionMenu';
import type { Action } from '../interactive/ActionMenu';
import styles from './CrudListItem.module.css';

export interface CrudListItemStatus {
  color: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
}

export interface CrudListItemTag {
  label: string;
  color?: string;
}

export interface CrudListItemProps {
  /** Avatar/icon element — use CrudListItem.Avatar for initials circle */
  avatar?: React.ReactNode;
  /** Primary title text */
  title: string;
  /** Secondary text below or next to title (e.g. slug, email) */
  subtitle?: string;
  /** Status badge */
  status?: CrudListItemStatus;
  /** Tag badges (e.g. plan, role, category) */
  tags?: CrudListItemTag[];
  /** Description line (truncated to 1 line by default) */
  description?: string;
  /** Footer content — rendered below description */
  footer?: React.ReactNode;
  /** Action menu items */
  actions?: Action[];
  /** Click handler for the whole card */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
}

export interface CrudListItemComponent extends React.FC<CrudListItemProps> {
  Avatar: typeof Avatar;
}

export const CrudListItem: CrudListItemComponent = function CrudListItem({
  avatar,
  title,
  subtitle,
  status,
  tags,
  description,
  footer,
  actions,
  onClick,
  className,
}: CrudListItemProps): React.ReactElement {
  return (
    <Card
      className={cn(styles.root, onClick && styles.clickable, className)}
      onClick={onClick}
      data-color="neutral"
    >
      <div className={styles.content}>
        {/* Left: Avatar/Icon */}
        {avatar && <div className={styles.avatarSlot}>{avatar}</div>}

        {/* Center: Details */}
        <div className={styles.details}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <Heading data-size="xs" className={styles.title}>
                {title}
              </Heading>
              {status && (
                <StatusTag color={status.color} size="sm">
                  {status.label}
                </StatusTag>
              )}
              {tags?.map((tag) => (
                <Tag
                  key={tag.label}
                  data-size="sm"
                  data-color={(tag.color as 'neutral') ?? 'neutral'}
                >
                  {tag.label}
                </Tag>
              ))}
            </div>
            {actions && actions.length > 0 && (
              <div
                className={styles.actionsSlot}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionMenu actions={actions} />
              </div>
            )}
          </div>

          {subtitle && (
            <Paragraph data-size="xs" data-color="subtle" className={styles.subtitle}>
              {subtitle}
            </Paragraph>
          )}

          {description && (
            <Paragraph
              data-size="sm"
              data-color="subtle"
              className={styles.description}
            >
              {description}
            </Paragraph>
          )}

          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── Sub-component: Avatar circle with initials ───

export interface CrudListItemAvatarProps {
  /** 1-2 character initials */
  initials: string;
  /** Size in pixels @default 40 */
  size?: number;
  /** Additional class name */
  className?: string;
}

function AvatarComponent({
  initials,
  size = 40,
  className,
}: CrudListItemAvatarProps): React.ReactElement {
  return (
    <div
      className={cn(styles.avatar, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Paragraph data-size="lg" className={styles.avatarText}>
        {initials}
      </Paragraph>
    </div>
  );
}

// To avoid circular or 'used before declaration' issues
const Avatar = AvatarComponent as React.FC<CrudListItemAvatarProps> & { displayName?: string };
Avatar.displayName = 'CrudListItem.Avatar';
CrudListItem.Avatar = Avatar;
CrudListItem.displayName = 'CrudListItem';
