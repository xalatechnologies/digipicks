/**
 * FormField Component
 * A wrapper for form inputs with label, description, and error message
 *
 * @deprecated Use `Field` from `@digdir/designsystemet-react` instead.
 * This component will be removed in a future version.
 */

import { Label } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import styles from './FormField.module.css';

/** @deprecated Use `Field` from `@digdir/designsystemet-react` instead. */
export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message */
  error?: string | undefined;
  /** Help text / description */
  description?: string | undefined;
  /** Children (the form control) */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

/** @deprecated Use `Field` from `@digdir/designsystemet-react` instead. */
export function FormField({
  label,
  required = false,
  error,
  description,
  children,
  className,
}: FormFieldProps): React.ReactElement {
  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <Label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </Label>
      )}
      {description && (
        <span className={styles.description}>
          {description}
        </span>
      )}
      {children}
      {error && (
        <span className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

export default FormField;
