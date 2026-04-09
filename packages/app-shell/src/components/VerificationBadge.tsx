/**
 * VerificationBadge — Reusable creator verification indicator.
 *
 * Shows a blue checkmark badge for verified creators.
 * Wraps in a Tooltip showing the verification date when available.
 */

import { Tooltip } from '@digipicks/ds';
import s from './VerificationBadge.module.css';

export interface VerificationBadgeProps {
  /** Whether the creator is verified */
  verified: boolean;
  /** Epoch ms when the creator was verified */
  verifiedAt?: number | null;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label override */
  label?: string;
}

function formatVerifiedDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path
      d="M13.5 4.5L6 12L2.5 8.5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function VerificationBadge({ verified, verifiedAt, size = 'sm', label }: VerificationBadgeProps) {
  if (!verified) return null;

  const sizeClass = size === 'sm' ? s.badgeSm : size === 'lg' ? s.badgeLg : s.badgeMd;
  const iconSizeClass = size === 'sm' ? s.iconSm : size === 'lg' ? s.iconLg : s.iconMd;

  const tooltipContent = verifiedAt ? `Verified ${formatVerifiedDate(verifiedAt)}` : (label ?? 'Verified Creator');

  return (
    <Tooltip content={tooltipContent}>
      <span className={`${s.badge} ${sizeClass}`} role="img" aria-label={tooltipContent}>
        <span className={`${s.icon} ${iconSizeClass}`}>
          <CheckIcon />
        </span>
      </span>
    </Tooltip>
  );
}
