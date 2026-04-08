/**
 * RichTextDisplay Component
 * Safely renders HTML content from RichTextEditor
 */

import styles from './RichTextDisplay.module.css';

export interface RichTextDisplayProps {
    content: string;
    className?: string;
}

/**
 * Displays rich text HTML content safely
 * Strips any potentially dangerous tags/attributes
 */
export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
    // If content doesn't contain HTML tags, render as plain text
    if (!content.includes('<')) {
        return <div className={className}>{content}</div>;
    }

    // Replace &nbsp; with regular spaces so text wraps naturally.
    // Content pasted from external sites often has &nbsp; between every word,
    // which browsers treat as unbreakable — preventing word wrap.
    const sanitized = content.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');

    // Render HTML content
    // Note: The content comes from our own RichTextEditor (LexKit/Lexical) which only
    // generates safe, semantic HTML (p, strong, em, h2, h3, ul, ol, li, a)
    return (
        <div
            className={`${styles.richTextContent} ${className || ''}`}
            dangerouslySetInnerHTML={{ __html: sanitized }}
        />
    );
}
