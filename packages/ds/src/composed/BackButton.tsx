import React from 'react';
import { Button } from '@digdir/designsystemet-react';
import { ArrowLeftIcon } from '../primitives';
import styles from './BackButton.module.css';

export interface BackButtonProps {
  /** Label text */
  children: React.ReactNode;
  /** Click handler (preferred) */
  onClick?: () => void;
  /** Optional href for anchor rendering */
  href?: string;
  /** Optional size */
  'data-size'?: 'sm' | 'md' | 'lg';
}

/**
 * A back-navigation button with a left arrow icon.
 *
 * Apps using react-router-dom can wrap this in `<Link>`:
 * ```tsx
 * <Link to="/seasons"><BackButton>Tilbake</BackButton></Link>
 * ```
 */
export function BackButton({
  children,
  onClick,
  href,
  'data-size': size = 'sm',
}: BackButtonProps) {
  const button = (
    <Button variant="tertiary" data-size={size} onClick={onClick} type="button">
      <ArrowLeftIcon aria-hidden />
      {children}
    </Button>
  );

  if (href) {
    return <a href={href} className={styles.link}>{button}</a>;
  }

  return button;
}
