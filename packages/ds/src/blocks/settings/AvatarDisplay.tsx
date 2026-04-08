/**
 * AvatarDisplay
 *
 * User avatar with initials fallback or image.
 * Used in headers, message lists, settings, etc.
 */

import * as React from 'react';
import { cn } from '../../utils';
import styles from './AvatarDisplay.module.css';

export interface AvatarDisplayProps {
  /** Display name for initials (e.g. "John Doe" → "JD") */
  name: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarDisplay({
  name,
  imageUrl,
  size = 'md',
  className,
}: AvatarDisplayProps): React.ReactElement {
  const initials = getInitials(name);
  const sizeClass = styles[size];

  return (
    <div
      className={cn(styles.avatar, sizeClass, className)}
      style={
        imageUrl
          ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
      role="img"
      aria-label={name}
    >
      {!imageUrl && initials}
    </div>
  );
}
