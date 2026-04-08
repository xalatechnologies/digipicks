/**
 * SettingsToggle
 *
 * Reusable settings toggle row — label, optional description, Switch.
 * Used in settings pages, notification preferences, etc.
 */

import * as React from 'react';
import { Switch, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../../primitives';
import { cn } from '../../utils';
import styles from './SettingsToggle.module.css';

export interface SettingsToggleProps {
  /** Toggle label */
  label: string;
  /** Optional description below label */
  description?: string;
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Optional icon before label */
  icon?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  icon,
  className,
}: SettingsToggleProps): React.ReactElement {
  return (
    <div className={cn(styles.row, className)}>
      <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
        {icon && <div className={styles.iconWrapper}>{icon}</div>}
        <Stack spacing="2px">
          <Paragraph data-size="sm"><strong>{label}</strong></Paragraph>
          {description && (
            <Paragraph data-size="xs">{description}</Paragraph>
          )}
        </Stack>
      </Stack>
      <Switch
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </div>
  );
}
