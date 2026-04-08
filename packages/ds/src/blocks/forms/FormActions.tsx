/**
 * FormActions
 *
 * Standardized action button group for forms.
 * Provides consistent layout for submit/cancel actions.
 */

import { Button } from '@digdir/designsystemet-react';
import { cn } from '../../utils';
import styles from './FormActions.module.css';

export interface FormActionsProps {
  /** Text for the primary submit button */
  submitText: string;
  /** Text for the secondary cancel button */
  cancelText?: string;
  /** Callback for cancel button */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Optional loading text to show during submission */
  submittingText?: string;
  /** Additional class name */
  className?: string;
}

export function FormActions({
  submitText,
  cancelText = 'Avbryt',
  onCancel,
  isSubmitting = false,
  submittingText = 'Lagrer...',
  className,
}: FormActionsProps): React.ReactElement {
  return (
    <div className={cn(styles.actions, className)}>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submittingText : submitText}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
    </div>
  );
}

FormActions.displayName = 'FormActions';
