/**
 * RevisionDiffView
 *
 * Visual component for rendering field-by-field before/after diffs.
 * Displays previousState and newState as a comparison table with
 * color-coded additions, removals, and modifications.
 *
 * Used in audit detail drawers and AuditTab to replace raw JSON rendering.
 */

import { useMemo } from 'react';
import styles from './RevisionDiffView.module.css';

export interface RevisionDiffViewProps {
    /** The state before the change */
    previousState?: Record<string, unknown> | null;
    /** The state after the change */
    newState?: Record<string, unknown> | null;
    /** List of fields that changed (optional — auto-computed if not provided) */
    changedFields?: string[];
    /** Whether to show unchanged fields (default: false) */
    showUnchanged?: boolean;
    /** Custom label for the "Before" column */
    beforeLabel?: string;
    /** Custom label for the "After" column */
    afterLabel?: string;
}

interface DiffField {
    key: string;
    previousValue: unknown;
    newValue: unknown;
    status: 'added' | 'removed' | 'modified' | 'unchanged';
}

function formatValue(value: unknown): string {
    if (value === undefined || value === null) return '–';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function RevisionDiffView({
    previousState,
    newState,
    changedFields,
    showUnchanged = false,
    beforeLabel = 'Før',
    afterLabel = 'Etter',
}: RevisionDiffViewProps) {
    const fields: DiffField[] = useMemo(() => {
        const prev = previousState ?? {};
        const next = newState ?? {};
        const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
        const changed = changedFields ? new Set(changedFields) : null;

        const result: DiffField[] = [];

        for (const key of allKeys) {
            const prevVal = prev[key];
            const nextVal = next[key];

            let status: DiffField['status'];
            if (prevVal === undefined && nextVal !== undefined) {
                status = 'added';
            } else if (prevVal !== undefined && nextVal === undefined) {
                status = 'removed';
            } else if (changed ? changed.has(key) : formatValue(prevVal) !== formatValue(nextVal)) {
                status = 'modified';
            } else {
                status = 'unchanged';
            }

            if (!showUnchanged && status === 'unchanged') continue;

            result.push({ key, previousValue: prevVal, newValue: nextVal, status });
        }

        // Sort: modified first, then added, then removed, then unchanged
        const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
        result.sort((a, b) => order[a.status] - order[b.status]);

        return result;
    }, [previousState, newState, changedFields, showUnchanged]);

    // No state data at all
    if (!previousState && !newState) {
        return (
            <div className={styles.empty}>
                Ingen endringsdata tilgjengelig
            </div>
        );
    }

    // Only new state (creation event)
    if (!previousState && newState) {
        return (
            <div className={styles.container}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.fieldHeader}>Felt</th>
                            <th className={styles.valueHeader}>Verdi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(newState).map(([key, value]) => (
                            <tr key={key} className={styles.rowAdded}>
                                <td className={styles.fieldCell}>{key}</td>
                                <td className={styles.valueCell}>
                                    <span className={styles.added}>{formatValue(value)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Full diff view
    if (fields.length === 0) {
        return (
            <div className={styles.empty}>
                Ingen endringer funnet
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.fieldHeader}>Felt</th>
                        <th className={styles.valueHeader}>{beforeLabel}</th>
                        <th className={styles.valueHeader}>{afterLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((field) => (
                        <tr key={field.key} className={styles[`row${capitalize(field.status)}`]}>
                            <td className={styles.fieldCell}>
                                <span className={styles.fieldName}>{field.key}</span>
                                <span className={`${styles.statusBadge} ${styles[field.status]}`}>
                                    {field.status === 'added' ? '+' : field.status === 'removed' ? '−' : field.status === 'modified' ? '~' : ''}
                                </span>
                            </td>
                            <td className={styles.valueCell}>
                                {field.status !== 'added' && (
                                    <span className={field.status === 'modified' || field.status === 'removed' ? styles.removed : ''}>
                                        {formatValue(field.previousValue)}
                                    </span>
                                )}
                            </td>
                            <td className={styles.valueCell}>
                                {field.status !== 'removed' && (
                                    <span className={field.status === 'modified' || field.status === 'added' ? styles.added : ''}>
                                        {formatValue(field.newValue)}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
