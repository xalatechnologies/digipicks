/**
 * NativeSelect — Styled wrapper for a native HTML <select> element.
 *
 * Uses DS tokens for consistent styling with the rest of the design system.
 * Supports `data-size` and `label` props.
 */

import { forwardRef } from 'react';
import { Label } from '@digdir/designsystemet-react';
import styles from './NativeSelect.module.css';

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label rendered above the select */
  label?: string;
  /** DS size token */
  'data-size'?: 'sm' | 'md' | 'lg';
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect({ label, className, children, ...rest }, ref) {
    return (
      <div className={styles.wrapper}>
        {label && <Label>{label}</Label>}
        <select
          ref={ref}
          className={`${styles.select} ${className ?? ''}`}
          {...rest}
        >
          {children}
        </select>
      </div>
    );
  },
);
