/**
 * InfoBox
 *
 * Reusable colored info/status boxes.
 * Supports different color variants matching the design system.
 */

import type { ReactNode } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../../utils';
import styles from './InfoBox.module.css';

export type InfoBoxVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface InfoBoxProps {
  /** Color variant */
  variant?: InfoBoxVariant;
  /** Box content */
  children: ReactNode;
  /** Optional title */
  title?: string;
  /** Additional class name */
  className?: string;
}

const variantClassMap: Record<InfoBoxVariant, string> = {
  info: styles.boxInfo,
  success: styles.boxSuccess,
  warning: styles.boxWarning,
  danger: styles.boxDanger,
  neutral: styles.boxNeutral,
};

const titleClassMap: Record<InfoBoxVariant, string> = {
  info: styles.titleInfo,
  success: styles.titleSuccess,
  warning: styles.titleWarning,
  danger: styles.titleDanger,
  neutral: styles.titleNeutral,
};

const contentClassMap: Record<InfoBoxVariant, string> = {
  info: styles.contentInfo,
  success: styles.contentSuccess,
  warning: styles.contentWarning,
  danger: styles.contentDanger,
  neutral: styles.contentNeutral,
};

export function InfoBox({
  variant = 'info',
  children,
  title,
  className,
}: InfoBoxProps): React.ReactElement {
  const boxClass = cn(styles.box, variantClassMap[variant], className);
  const titleClass = cn(styles.title, titleClassMap[variant]);
  const contentClass = cn(styles.content, contentClassMap[variant]);

  return (
    <div className={boxClass}>
      {title && (
        <Paragraph data-size="sm" className={titleClass}>
          {title}
        </Paragraph>
      )}
      <Paragraph data-size="sm" className={contentClass}>
        {children}
      </Paragraph>
    </div>
  );
}

InfoBox.displayName = 'InfoBox';
