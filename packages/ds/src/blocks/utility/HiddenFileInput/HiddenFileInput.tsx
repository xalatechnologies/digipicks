/**
 * HiddenFileInput — DS-compliant wrapper for programmatic file picker triggers.
 *
 * Usage:
 *   const ref = useRef<HTMLInputElement>(null);
 *   <HiddenFileInput ref={ref} accept="image/*" onChange={handleFile} />
 *   <Button onClick={() => ref.current?.click()}>Upload</Button>
 */
import * as React from 'react';

export interface HiddenFileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'style'> {
  /** Accepted MIME types / extensions, e.g. "image/*" or ".pdf,.doc" */
  accept?: string;
}

export const HiddenFileInput = React.forwardRef<HTMLInputElement, HiddenFileInputProps>(
  function HiddenFileInput(props, ref) {
    return (
      // eslint-disable-next-line xala/no-raw-html -- canonical hidden file input wrapper; all consumers use this instead of raw <input>
      <input
        ref={ref}
        type="file"
        {...props}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
        tabIndex={-1}
        aria-hidden
      />
    );
  },
);
