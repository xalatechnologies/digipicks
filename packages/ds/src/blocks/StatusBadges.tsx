/**
 * StatusBadges
 *
 * Platform-generic status badge components.
 * Domain-specific badges (booking, listing, season, etc.) are defined at the application level.
 *
 * Uses design tokens for consistent styling.
 */
import * as React from 'react';
import styles from './StatusBadges.module.css';
import { cn } from '../utils';

// =============================================================================
// Types
// =============================================================================

export type BadgeColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeConfig {
  color: BadgeColor;
  label: string;
}

// =============================================================================
// Base StatusTag Component
// =============================================================================

export interface StatusTagProps {
  children: React.ReactNode;
  color: BadgeColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusTag({
  children,
  color,
  size = 'sm',
  className,
}: StatusTagProps): React.ReactElement {
  return (
    <span
      className={cn(styles.statusTag, styles[color], styles[size], className)}
    >
      {children}
    </span>
  );
}

// =============================================================================
// Organization Status Badge
// =============================================================================

export type OrganizationStatusType = 'active' | 'inactive' | 'suspended';

const organizationStatusConfig: Record<OrganizationStatusType, StatusBadgeConfig> = {
  active: { color: 'success', label: 'Aktiv' },
  inactive: { color: 'neutral', label: 'Inaktiv' },
  suspended: { color: 'danger', label: 'Suspendert' },
};

export interface OrganizationStatusBadgeProps {
  status: OrganizationStatusType;
  size?: 'sm' | 'md' | 'lg';
}

export function OrganizationStatusBadge({ status, size = 'sm' }: OrganizationStatusBadgeProps): React.ReactElement {
  const config = organizationStatusConfig[status] || { color: 'neutral' as BadgeColor, label: status };
  return <StatusTag color={config.color} size={size}>{config.label}</StatusTag>;
}

// =============================================================================
// User Status Badge
// =============================================================================

export type UserStatusType = 'active' | 'inactive' | 'suspended';

const userStatusConfig: Record<UserStatusType, StatusBadgeConfig> = {
  active: { color: 'success', label: 'Aktiv' },
  inactive: { color: 'neutral', label: 'Inaktiv' },
  suspended: { color: 'danger', label: 'Suspendert' },
};

export interface UserStatusBadgeProps {
  status: UserStatusType;
  size?: 'sm' | 'md' | 'lg';
}

export function UserStatusBadge({ status, size = 'sm' }: UserStatusBadgeProps): React.ReactElement {
  const config = userStatusConfig[status] || { color: 'neutral' as BadgeColor, label: status };
  return <StatusTag color={config.color} size={size}>{config.label}</StatusTag>;
}

// =============================================================================
// Payment Status Badge
// =============================================================================

export type PaymentStatusType = 'paid' | 'unpaid' | 'partial' | 'refunded';

const paymentStatusConfig: Record<PaymentStatusType, StatusBadgeConfig> = {
  paid: { color: 'success', label: 'Betalt' },
  unpaid: { color: 'warning', label: 'Ikke betalt' },
  partial: { color: 'warning', label: 'Delvis betalt' },
  refunded: { color: 'neutral', label: 'Refundert' },
};

export interface PaymentStatusBadgeProps {
  status: PaymentStatusType;
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'sm' }: PaymentStatusBadgeProps): React.ReactElement {
  const config = paymentStatusConfig[status] || { color: 'neutral' as BadgeColor, label: status };
  return <StatusTag color={config.color} size={size}>{config.label}</StatusTag>;
}

// =============================================================================
// Status config registry (platform-generic only)
// =============================================================================

export const statusConfigs = {
  organization: organizationStatusConfig,
  user: userStatusConfig,
  payment: paymentStatusConfig,
};

// =============================================================================
// Generic Status Badge
// =============================================================================

export type StatusBadgeDomain = keyof typeof statusConfigs;

export interface StatusBadgeProps {
  status: string;
  domain?: StatusBadgeDomain;
  config?: Record<string, StatusBadgeConfig>;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Generic StatusBadge component.
 * Use the `domain` prop to select a built-in config, or provide a custom `config`.
 *
 * @example
 * <StatusBadge domain="organization" status="active" />
 * <StatusBadge config={myConfig} status="pending" />
 */
export function StatusBadge({ status, domain, config, size = 'sm' }: StatusBadgeProps): React.ReactElement {
  const resolvedConfig: Record<string, StatusBadgeConfig> | undefined = config ?? (domain ? statusConfigs[domain] : undefined);
  const statusConfig = resolvedConfig?.[status] || { color: 'neutral' as BadgeColor, label: status };
  return <StatusTag color={statusConfig.color} size={size}>{statusConfig.label}</StatusTag>;
}
