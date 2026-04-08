/**
 * RequireAuthModal
 *
 * Modal dialog displayed when an unauthenticated user attempts
 * an action that requires authentication.
 */
import * as React from 'react';
import { Dialog, Button, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import { UserIcon, CloseIcon } from '../primitives/icons';
import styles from './RequireAuthModal.module.css';

// =============================================================================
// Types
// =============================================================================

export interface RequireAuthModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Login handler */
  onLogin?: () => void;
  /** Register handler (optional) */
  onRegister?: () => void;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** The action that requires auth (for contextual messaging) */
  actionContext?: 'favorite' | 'book' | 'message' | 'review' | 'general';
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function RequireAuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  title,
  description,
  actionContext = 'general',
  className,
}: RequireAuthModalProps): React.ReactElement {
  // Get contextual messages
  const getContextualContent = () => {
    switch (actionContext) {
      case 'favorite':
        return {
          title: title || 'Logg inn for å lagre favoritter',
          description:
            description ||
            'Du må være innlogget for å lagre favoritter. Opprett en konto eller logg inn for å fortsette.',
        };
      case 'book':
        return {
          title: title || 'Logg inn for å booke',
          description:
            description ||
            'Du må være innlogget for å fullføre en booking. Opprett en konto eller logg inn for å fortsette.',
        };
      case 'message':
        return {
          title: title || 'Logg inn for å sende melding',
          description:
            description ||
            'Du må være innlogget for å kontakte utleier. Opprett en konto eller logg inn for å fortsette.',
        };
      case 'review':
        return {
          title: title || 'Logg inn for å skrive anmeldelse',
          description:
            description ||
            'Du må være innlogget for å skrive en anmeldelse. Opprett en konto eller logg inn for å fortsette.',
        };
      default:
        return {
          title: title || 'Innlogging kreves',
          description:
            description ||
            'Du må være innlogget for å utføre denne handlingen. Opprett en konto eller logg inn for å fortsette.',
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
            <UserIcon size={32} />
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
          {onLogin && (
            <Button
              type="button"
              onClick={onLogin}
              data-size="md"
              className={styles.actionButton}
            >
              Logg inn
            </Button>
          )}
          {onRegister && (
            <Button
              type="button"
              onClick={onRegister}
              variant="secondary"
              data-size="md"
              className={styles.actionButton}
            >
              Opprett konto
            </Button>
          )}
        </Stack>

        {/* Help text */}
        <Paragraph data-size="xs" className={styles.helpText}>
          Ved å logge inn godtar du våre vilkår og personvernerklæring.
        </Paragraph>
      </Dialog.Block>
    </Dialog>
  );
}

export default RequireAuthModal;
