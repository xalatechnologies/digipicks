/**
 * PushNotificationPrompt
 *
 * Modal dialog displayed to request browser push notification permission
 * from the user for receiving booking updates and reminders.
 */
import * as React from 'react';
import { Dialog, Button, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import { BellIcon, CloseIcon } from '../primitives/icons';
import styles from './RequireAuthModal.module.css';

// =============================================================================
// Types
// =============================================================================

export interface PushNotificationPromptProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Enable notifications handler */
  onEnable?: () => void;
  /** Dismiss handler (optional, defaults to onClose) */
  onDismiss?: () => void;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Context for the prompt (affects messaging) */
  context?: 'booking' | 'reminder' | 'general';
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PushNotificationPrompt({
  isOpen,
  onClose,
  onEnable,
  onDismiss,
  title,
  description,
  context = 'general',
  className,
}: PushNotificationPromptProps): React.ReactElement {
  // Get contextual messages
  const getContextualContent = () => {
    switch (context) {
      case 'booking':
        return {
          title: title || 'Få varsler om dine bookinger',
          description:
            description ||
            'Hold deg oppdatert om bookingbekreftelser, endringer og kanselleringer direkte i nettleseren din.',
        };
      case 'reminder':
        return {
          title: title || 'Ikke gå glipp av dine bookinger',
          description:
            description ||
            'Vi kan sende deg påminnelser før dine bookinger så du aldri glemmer en avtale.',
        };
      default:
        return {
          title: title || 'Aktiver varsler',
          description:
            description ||
            'Få viktige oppdateringer om dine bookinger direkte i nettleseren din.',
        };
    }
  };

  const content = getContextualContent();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className={cn(styles.dialog, className)}
    >
      <Dialog.Block>
        {/* Close button */}
        <div className={styles.closeRow}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className={styles.closeButton}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Icon */}
        <div className={styles.iconWrap}>
          <div className={styles.iconCircle}>
            <BellIcon size={32} />
          </div>
        </div>

        {/* Title */}
        <Heading level={2} data-size="sm" className={styles.title}>
          {content.title}
        </Heading>

        {/* Description */}
        <Paragraph data-size="sm" className={styles.description}>
          {content.description}
        </Paragraph>

        {/* Actions */}
        <Stack spacing="var(--ds-size-2)">
          {onEnable && (
            <Button
              type="button"
              onClick={onEnable}
              data-size="md"
              className={styles.actionButton}
            >
              Aktiver varsler
            </Button>
          )}
          <Button
            type="button"
            onClick={onDismiss || onClose}
            variant="secondary"
            data-size="md"
            className={styles.actionButton}
          >
            Kanskje senere
          </Button>
        </Stack>
      </Dialog.Block>
    </Dialog>
  );
}
