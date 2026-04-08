/**
 * RichTextEditor Component
 * A rich text editor built with React Quill for formatted content editing.
 * Themed via DS tokens through CSS overrides.
 */

import { useCallback, useMemo, useRef } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import styles from './RichTextEditor.module.css';

/** Ensure value is valid HTML for Quill — wrap plain text in <p> */
function toHtml(value: string): string {
    if (!value) return '';
    if (value.includes('<')) return value;
    return `<p>${value}</p>`;
}

/** Strip HTML tags to get plain text */
function toPlainText(html: string): string {
    return (html || '').replace(/<[^>]*>/g, '').trim();
}

export interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    minHeight?: number;
    disabled?: boolean;
    error?: boolean;
    label?: string;
    description?: string;
    toolbar?: 'full' | 'minimal' | 'none';
}

const FULL_TOOLBAR = [
    ['bold', 'italic'],
    [{ header: [2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
];

const MINIMAL_TOOLBAR = [
    ['bold', 'italic'],
    [{ list: 'ordered' }, { list: 'bullet' }],
];

const FORMATS = [
    'bold', 'italic',
    'header',
    'list',
    'link',
];

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing...',
    maxLength,
    minHeight = 200,
    disabled = false,
    error = false,
    label,
    description,
    toolbar = 'full',
}: RichTextEditorProps) {
    const quillRef = useRef<ReactQuill | null>(null);
    const lastValueRef = useRef(value);

    const handleChange = useCallback((content: string, _delta: unknown, source: string) => {
        // Only emit onChange for user-initiated edits, not programmatic updates
        if (source !== 'user') return;

        // Normalize Quill's empty content to empty string
        const isEmpty = content === '<p><br></p>' || content === '<p></p>';
        const normalized = isEmpty ? '' : content;

        // Avoid no-op updates
        if (normalized === lastValueRef.current) return;

        lastValueRef.current = normalized;
        onChange(normalized);
    }, [onChange]);

    const modules = useMemo(() => ({
        toolbar: toolbar === 'none' ? false : (toolbar === 'minimal' ? MINIMAL_TOOLBAR : FULL_TOOLBAR),
    }), [toolbar]);

    // Normalize value: plain text → HTML for Quill
    const htmlValue = useMemo(() => toHtml(value), [value]);

    // Keep ref in sync with external value
    lastValueRef.current = value;

    // Character count
    const charCount = toPlainText(value).length;
    const percentage = maxLength ? Math.round((100 / maxLength) * charCount) : 0;

    return (
        <div className={styles.container}>
            {label && (
                <label className={styles.label}>
                    {label}
                </label>
            )}
            {description && (
                <Paragraph data-size="sm" className={styles.description}>
                    {description}
                </Paragraph>
            )}

            <div
                className={`${styles.editorWrapper} ${error ? styles.editorError : ''} ${disabled ? styles.editorDisabled : ''}`}
                style={{ ['--rte-min-height' as string]: `${minHeight}px` }}
            >
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={htmlValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    readOnly={disabled}
                    modules={modules}
                    formats={FORMATS}
                />
            </div>

            {maxLength && (
                <div className={styles.footer}>
                    <Paragraph data-size="xs" className={percentage > 95 ? styles.characterCountWarning : styles.characterCount}>
                        {charCount} / {maxLength} tegn
                    </Paragraph>
                </div>
            )}
        </div>
    );
}
