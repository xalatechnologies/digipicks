/**
 * FormSection
 *
 * Standardized section header for forms.
 * Provides consistent styling for form sections across applications.
 */

import type { ReactNode } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../../utils';
import styles from './FormSection.module.css';

export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Section content */
  children: ReactNode;
  /** Optional description below title */
  description?: string;
  /** Additional class name */
  className?: string;
}

export function FormSection({
  title,
  children,
  description,
  className,
}: FormSectionProps): React.ReactElement {
  return (
    <div className={cn(styles.section, className)}>
      <Paragraph data-size="sm" className={styles.title}>
        {title}
      </Paragraph>
      {description && (
        <Paragraph data-size="sm" className={styles.description}>
          {description}
        </Paragraph>
      )}
      {children}
    </div>
  );
}

FormSection.displayName = 'FormSection';
