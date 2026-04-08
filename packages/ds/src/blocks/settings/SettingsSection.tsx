/**
 * SettingsSection
 *
 * Reusable settings section card — title, optional description, icon.
 * Groups related settings (e.g. profile, notifications).
 */

import * as React from 'react';
import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../../primitives';
import { cn } from '../../utils';
import styles from './SettingsSection.module.css';

export interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon before title */
  icon?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: SettingsSectionProps): React.ReactElement {
  return (
    <Card className={cn(styles.card, className)}>
      <Stack spacing="var(--ds-size-4)">
        <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
          {icon && <div className={styles.iconWrapper}>{icon}</div>}
          <Stack spacing="var(--ds-size-1)">
            <Heading data-size="xs">{title}</Heading>
            {description && (
              <Paragraph data-size="sm">{description}</Paragraph>
            )}
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}
