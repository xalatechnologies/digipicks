/**
 * Content Section Component
 * 
 * High-level section component for grouping related content
 */

import React, { forwardRef } from 'react';
import { Fieldset, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import styles from './content-section.module.css';

export interface ContentSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Whether to use Fieldset wrapper @default true */
  fieldset?: boolean;
  /** Heading level for the title @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Direction of content @default 'vertical' */
  direction?: 'vertical' | 'horizontal';
  /** Spacing between content items @default 16 */
  contentSpacing?: number;
}

export const ContentSection = forwardRef<HTMLDivElement, ContentSectionProps>(
  ({
    children,
    title,
    subtitle,
    fieldset = true,
    level = 2,
    direction = 'vertical',
    contentSpacing = 16,
    className,
    ...props
  }, ref) => {
    const header = (
      <Stack
        spacing={8}
        className={styles.headerGroup}
        data-has-subtitle={!!subtitle}
      >
        {title && (
          <Heading level={level}>
            {title}
          </Heading>
        )}
        {subtitle && (
          <Paragraph className={styles.subtitle}>
            {subtitle}
          </Paragraph>
        )}
      </Stack>
    );

    const content = (
      <Stack direction={direction} spacing={contentSpacing}>
        {children}
      </Stack>
    );

    if (fieldset) {
      return (
        <Fieldset
          ref={ref as React.Ref<HTMLFieldSetElement>}
          className={cn(styles.section, className)}
          {...(props as any)}
        >
          {header}
          {content}
        </Fieldset>
      );
    }

    return (
      <div ref={ref} className={cn(styles.section, className)} {...props}>
        {header}
        {content}
      </div>
    );
  }
);

ContentSection.displayName = 'ContentSection';
